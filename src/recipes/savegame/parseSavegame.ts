import { Parser } from '@etothepii/satisfactory-file-parser';

async function parseSavegame(file: File) {
  const json = Parser.ParseSave('Save', await file.arrayBuffer());
  console.log(json);
}

addEventListener('message', event => {
  const { data } = event;
  if (data === 'parse') {
    parseSavegame(data.file);
  }
});
