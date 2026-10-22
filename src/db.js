import fs from 'node:fs';

export function createStore(filePath) {
  let data;
  try {
    data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    throw new Error(`Could not read database at ${filePath}. Run "npm run seed" first. (${err.code ?? err.message})`);
  }

  return {
    get data() {
      return data;
    },
    save() {
      const tmp = `${filePath}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
      fs.renameSync(tmp, filePath);
    },
  };
}

export function nextOrderNumber(store) {
  store.data.meta.nextOrderNumber += 1;
  return store.data.meta.nextOrderNumber;
}