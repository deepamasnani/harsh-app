import { google } from "googleapis";
import { Readable } from "stream";
import { prisma } from "./db";
import { decrypt, encrypt } from "./crypto";
import { folderSlug } from "./money";

const FOLDER_MIME = "application/vnd.google-apps.folder";
const SCOPES = ["https://www.googleapis.com/auth/drive.file"];

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
  return { client, row };
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

async function findChild(drive: ReturnType<typeof google.drive>, parentId: string, name: string, folder: boolean) {
  const q = [
    `name = '${name.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`,
    `'${parentId}' in parents`,
    "trashed = false",
    folder ? `mimeType = '${FOLDER_MIME}'` : `mimeType != '${FOLDER_MIME}'`,
  ].join(" and ");
  const res = await drive.files.list({ q, fields: "files(id, name)", pageSize: 1, spaces: "drive" });
  return res.data.files?.[0]?.id || null;
}

async function createFolder(drive: ReturnType<typeof google.drive>, parentId: string, name: string) {
  const created = await drive.files.create({
    requestBody: { name, mimeType: FOLDER_MIME, parents: [parentId] },
    fields: "id",
  });
  return created.data.id!;
}

async function childFolder(drive: ReturnType<typeof google.drive>, parentId: string, name: string) {
  return (await findChild(drive, parentId, name, true)) || createFolder(drive, parentId, name);
}

async function ensureShopFolders(drive: ReturnType<typeof google.drive>) {
  const listed = await drive.files.list({
    q: `name = 'Harsh Hardware' and mimeType = '${FOLDER_MIME}' and trashed = false`,
    fields: "files(id)",
    pageSize: 1,
  });
  const rootFolderId = listed.data.files?.[0]?.id || (await createFolder(drive, "root", "Harsh Hardware"));
  const signaturesFolderId = await childFolder(drive, rootFolderId, "signatures");
  const invoicesFolderId = await childFolder(drive, rootFolderId, "invoices");
  return { rootFolderId, signaturesFolderId, invoicesFolderId };
}

async function putFile(
  drive: ReturnType<typeof google.drive>,
  parentId: string,
  name: string,
  data: Buffer,
  mime: string
) {
  const existing = await findChild(drive, parentId, name, false);
  const body = Readable.from(data);
  if (existing) {
    await drive.files.update({
      fileId: existing,
      media: { mimeType: mime, body },
    });
    return existing;
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
  const { client, row } = await loadClient();
  const drive = google.drive({ version: "v3", auth: client });
  const day = opts.createdAt.toLocaleString("en-CA", { timeZone: "Asia/Kolkata" }).slice(0, 10);
  const cust = await childFolder(drive, row.invoicesFolderId, folderSlug(opts.customerName));
  const dateFolder = await childFolder(drive, cust, day);
  const pdfId = await putFile(drive, dateFolder, `${opts.number}.pdf`, opts.pdf, "application/pdf");
  let signatureFileId: string | null = null;
  if (opts.signaturePng && opts.signaturePng.length > 80) {
    signatureFileId = await putFile(drive, row.signaturesFolderId, `${opts.number}.png`, opts.signaturePng, "image/png");
    await putFile(drive, dateFolder, `${opts.number}.png`, opts.signaturePng, "image/png");
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
