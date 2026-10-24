import * as FileSystem from 'expo-file-system/legacy';

// Everything the War Map saves lives in one JSON file of { 'days/2027-01-04': {...} }
// documents, plus photos as files in _blob/.
const ROOT = FileSystem.documentDirectory + 'war-map/';
const DOCS = ROOT + 'docs.json';
export const BLOB_DIR = ROOT + '_blob/';
export const PAGE = ROOT + 'index.html';

let docs = {};
let saveTimer = null;

export async function loadStore() {
  await FileSystem.makeDirectoryAsync(BLOB_DIR, { intermediates: true }).catch(() => {});
  const info = await FileSystem.getInfoAsync(DOCS);
  if (info.exists) {
    try {
      docs = JSON.parse(await FileSystem.readAsStringAsync(DOCS));
    } catch (e) {
      // Keep the unreadable file for recovery rather than overwriting it.
      await FileSystem.copyAsync({ from: DOCS, to: ROOT + `docs-unreadable-${Date.now()}.json` });
      docs = {};
    }
  }
  return docs;
}

export const allDocs = () => docs;
export const getDoc = (path) => docs[path];

export function setDoc(path, data) {
  if (data == null) delete docs[path];
  else docs[path] = data;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flush, 300);
}

export async function flush() {
  clearTimeout(saveTimer);
  const tmp = DOCS + '.tmp';
  await FileSystem.writeAsStringAsync(tmp, JSON.stringify(docs));
  await FileSystem.moveAsync({ from: tmp, to: DOCS });
}

export async function writePage(html) {
  const info = await FileSystem.getInfoAsync(PAGE);
  if (info.exists && (await FileSystem.readAsStringAsync(PAGE)) === html) return;
  await FileSystem.writeAsStringAsync(PAGE, html);
}

export async function saveBlob(b64, mime) {
  const ext = mime === 'image/png' ? 'png' : mime === 'image/heic' ? 'heic' : 'jpg';
  const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}.${ext}`;
  await FileSystem.writeAsStringAsync(BLOB_DIR + id, b64, { encoding: FileSystem.EncodingType.Base64 });
  return id;
}

export async function writeExport(filename, { text, b64 }) {
  const uri = FileSystem.cacheDirectory + filename.replace(/[^\w.-]+/g, '-');
  if (b64 != null) await FileSystem.writeAsStringAsync(uri, b64, { encoding: FileSystem.EncodingType.Base64 });
  else await FileSystem.writeAsStringAsync(uri, text ?? '');
  return uri;
}
