const s = new Set();
const m = new Map();
const a = new Array();

for (let i = 0; i < 1_000_000; i++) {
    s.add(i);
    m.set(i, i);
    a.push(i);
}

console.time('Set.has#');
for (let i = 0; i < 1_000_000; i++) {
    s.has(499_99);
}
console.timeEnd('Set.has#');

console.time('Map.has#');
for (let i = 0; i < 1_000_000; i++) {
    m.has(499_99);
}
console.timeEnd('Map.has#');


// Extremely slow
// console.time('Array.includes#');
// for (let i = 0; i < 1_000_000; i++) {
//     a.includes(999_999);
// }
// console.timeEnd('Array.includes#');

console.time('Map.get#');
for (let i = 0; i < 1_000_000; i++) {
    m.get(499_99);
}
console.timeEnd('Map.get#');

console.time('Array.[]#');
for (let i = 0; i < 1_000_000; i++) {
    a[499_99];
}
console.timeEnd('Array.[]#');

