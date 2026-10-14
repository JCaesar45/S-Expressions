function parseSexpr(str) {
  let pos = 0;
  
  function skipWhitespace() {
    while (pos < str.length && /\s/.test(str[pos])) {
      pos++;
    }
  }
  
  function parseToken() {
    skipWhitespace();
    
    if (pos >= str.length) {
      return null;
    }
    
    if (str[pos] === '(') {
      pos++; // skip '('
      const list = [];
      
      while (true) {
        skipWhitespace();
        if (pos >= str.length) {
          throw new Error('Unexpected end of input');
        }
        if (str[pos] === ')') {
          pos++; // skip ')'
          break;
        }
        list.push(parseToken());
      }
      
      return list;
    }
    
    if (str[pos] === '"') {
      // quoted string - include the quotes in the result
      const start = pos;
      pos++; // skip opening quote
      while (pos < str.length && str[pos] !== '"') {
        pos++;
      }
      if (pos < str.length) {
        pos++; // skip closing quote
      }
      return str.slice(start, pos);
    }
    
    // unquoted token
    const start = pos;
    while (pos < str.length && !/[\s()]/.test(str[pos])) {
      pos++;
    }
    
    const token = str.slice(start, pos);
    
    // Try to parse as number
    const num = Number(token);
    if (!isNaN(num) && token !== '') {
      return num;
    }
    
    return token;
  }
  
  skipWhitespace();
  return parseToken();
}
