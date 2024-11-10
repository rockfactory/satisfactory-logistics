/**
 * This isn't accurate, but it's a start.
 * It's enough for optimization purposes.
 */
export function parseClearanceData(raw) {
  let data = raw;
  // Step 1: Replace parentheses with braces
  data = data.replace(/\(/g, '{').replace(/\)/g, '}');

  // Step 2: Replace '=' with ':'
  data = data.replace(/=/g, ':');

  // Step 3: Replace 'True' and 'False' with 'true' and 'false'
  data = data.replace(/\bTrue\b/g, 'true').replace(/\bFalse\b/g, 'false');

  // Step 4: Add quotes around keys
  data = data.replace(/(\w+):/g, '"$1":');

  // Step 5: Add quotes around unquoted string values
  data = data.replace(
    /:(?!true\b|false\b|null\b)([A-Za-z_][A-Za-z0-9_]*)(?=[,}])/g,
    function (match, p1) {
      return ':"' + p1 + '"';
    },
  );

  // Step 6: Remove extra outer braces if necessary
  if (data.startsWith('{{') && data.endsWith('}}')) {
    data = data.substring(1, data.length - 1);
  }

  // Step 7: Wrap the entire string in an array
  data = '[' + data + ']';

  // Step 8: Parse the string into a JavaScript object
  //   console.log('trying to parse', raw, '<---');
  const parsedData = JSON.parse(data);
  // console.log(
  //   `Clearances:`,
  //   parsedData.map(
  //     c =>
  //       `x=${c.ClearanceBox.Min.X}, y=${c.ClearanceBox.Min.Y}, z=${c.ClearanceBox.Min.Z} -> x=${c.ClearanceBox.Max.X}, y=${c.ClearanceBox.Max.Y}, z=${c.ClearanceBox.Max.Z} ${c.Type} (w=${c.ClearanceBox.Max.X - c.ClearanceBox.Min.X}, l=${c.ClearanceBox.Max.Y - c.ClearanceBox.Min.Y}, h=${c.ClearanceBox.Max.Z - c.ClearanceBox.Min.Z}, ${c.Type},${c.ExcludeForSnapping ? 'EX' : ''})`,
  //   ),
  // );
  //   console.log(JSON.stringify(parsedData, null, 2));
  //   console.log('parsedData', parsedData);

  const clearances = parsedData.filter(c => !c.ExcludeForSnapping);

  const allX = clearances
    .map(c => c.ClearanceBox.Min.X)
    .concat(clearances.map(c => c.ClearanceBox.Max.X));
  const allY = clearances
    .map(c => c.ClearanceBox.Min.Y)
    .concat(clearances.map(c => c.ClearanceBox.Max.Y));
  const allZ = clearances
    .map(c => c.ClearanceBox.Min.Z)
    .concat(clearances.map(c => c.ClearanceBox.Max.Z));

  const minX = Math.min(...allX);
  const maxX = Math.max(...allX);
  const minY = Math.min(...allY);
  const maxY = Math.max(...allY);
  const minZ = Math.min(...allZ);
  const maxZ = Math.max(...allZ);

  return {
    // Convert to meters from cms (UE units)
    width: (maxX - minX) / 100,
    length: (maxY - minY) / 100,
    height: (maxZ - minZ) / 100,
  };
}
