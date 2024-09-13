
const a = [];
const h = [];
const r = {}
const m = new Map();

for (let i = 0; i < 1_000_000; i++) {
    a[i] = i;
}

for (let i = 0; i < 1_000_000; i++) {
    r[5 * i] = i;
}

for (let i = 0; i < 1_000_000; i++) {
    m.set(5 * i, i);
}

console.time('#1')
for (let val of a) {
    val = val + 1;
}
console.timeEnd('#1')

console.log(a[5]);

console.time('#2')
for (const key in a) {
    a[key] = a[key] + 1;
}
console.timeEnd('#2')

console.log(a[5]);

console.time('#3')
a.forEach((val, key, arr) => {
    a[key] = val + 1;
});
console.timeEnd('#3')

console.log(a[5]);

console.time('#4')
for (let i = 0; i < 1_000_000; i++) {
    a[i] = a[i] + 1;
}
console.timeEnd('#4')

console.log(a[5]);

// console.time('Array')
// for (let i = 0; i < 1_000_000; i++) {
//     a[i] = i;
// }
// for (let i in a) {
//     a[i] = a[i] + 1;
// }
// console.timeEnd('Array')

// console.time('Associative array')
// for (let i = 0; i < 1_000_000; i++) {
//     h[5 * i] = i;
// }
// for (let i in h) {
//     h[i] = h[i] + 1;
// }
// console.timeEnd('Associative array')

// console.time('Record')
// for (let i = 0; i < 1_000_000; i++) {
//     r[5 * i] = i;
// }
// for (let i in r) {
//     r[i] = r[i] + 1;
// }
// console.timeEnd('Record')

// console.time('Map')
// for (let i = 0; i < 1_000_000; i++) {
//     m.set(5 * i, i);
// }
// for (let i of m.keys()) {
//     m.set(i, m.get(i) + 1);
// }
// console.timeEnd('Map')

// console.log(a[5], h[25], r[25], m.get(25));