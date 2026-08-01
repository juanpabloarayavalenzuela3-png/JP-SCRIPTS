function generateLuaWrapper(sourceCode) {
  const key = Math.floor(Math.random() * 250) + 1;
  let encryptedBytes = [];
  
  for (let i = 0; i < sourceCode.length; i++) {
    encryptedBytes.push(sourceCode.charCodeAt(i) ^ key);
  }
  
  return `-- Protected Loader\nlocal k=${key}\nlocal d={${encryptedBytes.join(',')}}\nlocal b={}\nfor i=1,#d do b[i]=string.char(bit32.bxor(d[i],k)) end\nlocal s=table.concat(b)\nlocal f=assert(loadstring or load)(s)\nreturn f()`;
}

module.exports = { generateLuaWrapper };
