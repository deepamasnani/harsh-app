import { google } from "googleapis";
import { Readable } from "stream";
import { prisma } from "./db";
import { decrypt, encrypt } from "./crypto";
import { folderSlug } from "./money";
import { shop } from "./shop";

const FOLDER_MIME = "application/vnd.google-apps.folder";
const SCOPES = ["https://www.googleapis.com/auth/drive.file"];

type Drive = ReturnType<typeof google.drive>;

const g = globalThis as unknown as {
  driveFolderCache?: Map<string, string>;
  driveFolderLocks?: Map<string, Promise<string>>;
};

function folderCache() {
  if (!g.driveFolderCache) g.driveFolderCache = new Map();
  if (!g.driveFolderLocks) g.driveFolderLocks = new Map();
  return { cache: g.driveFolderCache, locks: g.driveFolderLocks };
}

function shopRootName() {
  return shop().name || "BB Traders";
}

function appOrigin(origin?: string) {
  return (origin || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

function oauthClient(origin?: string) {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${appOrigin(origin)}/api/auth/google/callback`
  );
}

export function driveAuthUrl(origin?: string) {
  return oauthClient(origin).generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
  });
}

function escapeDriveName(name: string) {
  return name.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

async function loadClient() {
  const row = await prisma.googleDriveConnection.findUnique({ where: { id: 1 } });
  if (!row) throw new Error("Google Drive is not connected. Open Settings and connect Drive.");
  const client = oauthClient();
  let access = row.accessTokenEnc ? decrypt(row.accessTokenEnc) : "";
  const refresh = decrypt(row.refreshTokenEnc);
  client.setCredentials({
    access_token: access || undefined,
    refresh_token: refresh,
    expiry_date: row.expiresAt.getTime(),
  });
  if (Date.now() > row.expiresAt.getTime() - 60_000) {
    const { credentials } = await client.refreshAccessToken();
    access = credentials.access_token || access;
    await prisma.googleDriveConnection.update({
      where: { id: 1 },
      data: {
        accessTokenEnc: credentials.access_token ? encrypt(credentials.access_token) : row.accessTokenEnc,
        expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : new Date(Date.now() + 3500_000),
      },
    });
    client.setCredentials(credentials);
  }
  const drive = google.drive({ version: "v3", auth: client });
  const folders = await ensureShopFolders(drive);
  if (
    folders.rootFolderId !== row.rootFolderId ||
    folders.invoicesFolderId !== row.invoicesFolderId ||
    folders.signaturesFolderId !== row.signaturesFolderId
  ) {
    await prisma.googleDriveConnection.update({ where: { id: 1 }, data: folders });
  }
  return { client, drive, row: { ...row, ...folders } };
}

export async function saveDriveTokens(code: string, origin?: string) {
  const client = oauthClient(origin);
  const { tokens } = await client.getToken(code);
  if (!tokens.refresh_token) {
    throw new Error("Google did not return a refresh token. Disconnect the app in Google Account permissions and try again.");
  }
  client.setCredentials(tokens);
  const drive = google.drive({ version: "v3", auth: client });
  const about = await drive.about.get({ fields: "user(emailAddress)" });
  const folders = await ensureShopFolders(drive);
  const expiresAt = tokens.expiry_date ? new Date(tokens.expiry_date) : new Date(Date.now() + 3500_000);
  await prisma.googleDriveConnection.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      refreshTokenEnc: encrypt(tokens.refresh_token),
      accessTokenEnc: encrypt(tokens.access_token || ""),
      expiresAt,
      connectedEmail: about.data.user?.emailAddress || null,
      ...folders,
    },
    update: {
      refreshTokenEnc: encrypt(tokens.refresh_token),
      accessTokenEnc: encrypt(tokens.access_token || ""),
      expiresAt,
      connectedEmail: about.data.user?.emailAddress || null,
      ...folders,
    },
  });
  return about.data.user?.emailAddress || "";
}

async function listNamed(
  drive: Drive,
  parentId: string,
  name: string,
  folder: boolean
) {
  const q = [
    `name = '${escapeDriveName(name)}'`,
    `'${parentId}' in parents`,
    "trashed = false",
    folder ? `mimeType = '${FOLDER_MIME}'` : `mimeType != '${FOLDER_MIME}'`,
  ].join(" and ");
  const res = await drive.files.list({
    q,
    fields: "files(id, name, createdTime)",
    pageSize: 20,
    orderBy: "createdTime",
    spaces: "drive",
  });
  return res.data.files || [];
}

async function createFolder(drive: Drive, parentId: string, name: string) {
  const created = await drive.files.create({
    requestBody: { name, mimeType: FOLDER_MIME, parents: [parentId] },
    fields: "id",
  });
  return created.data.id!;
}

async function childFolderUncached(drive: Drive, parentId: string, name: string) {
  const hits = await listNamed(drive, parentId, name, true);
  if (hits[0]?.id) return hits[0].id;
  try {
    return await createFolder(drive, parentId, name);
  } catch {
    const again = await listNamed(drive, parentId, name, true);
    if (again[0]?.id) return again[0].id;
    throw new Error(`Could not open Drive folder ${name}`);
  }
}

async function childFolder(drive: Drive, parentId: string, name: string) {
  const key = `${parentId}:${name}`;
  const { cache, locks } = folderCache();
  const cached = cache.get(key);
  if (cached) return cached;
  const pending = locks.get(key);
  if (pending) return pending;
  const job = childFolderUncached(drive, parentId, name)
    .then((id) => {
      cache.set(key, id);
      return id;
    })
    .finally(() => {
      locks.delete(key);
    });
  locks.set(key, job);
  return job;
}

async function ensureShopFolders(drive: Drive) {
  const rootName = shopRootName();
  const listed = await drive.files.list({
    q: `name = '${escapeDriveName(rootName)}' and 'root' in parents and mimeType = '${FOLDER_MIME}' and trashed = false`,
    fields: "files(id, createdTime)",
    pageSize: 10,
    orderBy: "createdTime",
    spaces: "drive",
  });
  const rootFolderId = listed.data.files?.[0]?.id || (await createFolder(drive, "root", rootName));
  const signaturesFolderId = await childFolder(drive, rootFolderId, "signatures");
  const invoicesFolderId = await childFolder(drive, rootFolderId, "invoices");
  return { rootFolderId, signaturesFolderId, invoicesFolderId };
}

async function putFile(drive: Drive, parentId: string, name: string, data: Buffer, mime: string) {
  const existing = await listNamed(drive, parentId, name, false);
  const body = Readable.from(data);
  if (existing[0]?.id) {
    await drive.files.update({
      fileId: existing[0].id,
      media: { mimeType: mime, body },
    });
    return existing[0].id;
  }
  const created = await drive.files.create({
    requestBody: { name, parents: [parentId] },
    media: { mimeType: mime, body },
    fields: "id",
  });
  return created.data.id!;
}

export async function uploadInvoiceDump(opts: {
  customerName: string;
  createdAt: Date;
  number: string;
  pdf: Buffer;
  signaturePng?: Buffer | null;
}) {
  const { drive, row } = await loadClient();
  const day = opts.createdAt.toLocaleString("en-CA", { timeZone: "Asia/Kolkata" }).slice(0, 10);
  const slug = folderSlug(opts.customerName);
  const invoiceCustomer = await childFolder(drive, row.invoicesFolderId, slug);
  const invoiceDay = await childFolder(drive, invoiceCustomer, day);
  const pdfId = await putFile(drive, invoiceDay, `${opts.number}.pdf`, opts.pdf, "application/pdf");
  let signatureFileId: string | null = null;
  if (opts.signaturePng && opts.signaturePng.length > 80) {
    const sigCustomer = await childFolder(drive, row.signaturesFolderId, slug);
    const sigDay = await childFolder(drive, sigCustomer, day);
    signatureFileId = await putFile(drive, sigDay, `${opts.number}.png`, opts.signaturePng, "image/png");
  }
  return { pdfId, signatureFileId };
}

export async function downloadDriveFile(fileId: string) {
  const { client } = await loadClient();
  const drive = google.drive({ version: "v3", auth: client });
  const res = await drive.files.get({ fileId, alt: "media" }, { responseType: "arraybuffer" });
  return Buffer.from(res.data as ArrayBuffer);
}

export async function driveStatus() {
  const row = await prisma.googleDriveConnection.findUnique({ where: { id: 1 } });
  if (!row) return { connected: false, email: null };
  return { connected: true, email: row.connectedEmail };
}

export async function disconnectDrive() {
  await prisma.googleDriveConnection.deleteMany({ where: { id: 1 } });
}
