# Raptor

## To be done...

- [x] Respect calendar and calendar dates
- [x] Support footpath transfers
- [x] Support midnight transfers (journeys that start before midnight and end after midnight)
- [ ] Implement rRAPTOR extension for finding multiple journeys

---

# Notes

## Test

Kraków Opatkowice Wiadukt:
- 1295836 (PARENT)
- 1355067 (START)
- 1355068

Kraków Rondo Grunwaldzkie:
- 959789 (PARENT)
- 1014871 (END)
- 1014872
- 1536334 (START)

Kraków Wodociągi:
- 771673 (PARENT)
- 824744
- 824745 (END)

### Zero Transfers

Date: Monday after 09:00:00

Source: 1355067 (Kraków Opatkowice Wiadukt)

Target: 1014871 (Kraków Rondo Grunwaldzkie)

### One Transfer

Date: Monday after 09:00:00

Source: 1355067 (Kraków Opatkowice Wiadukt)

Target: 824745 (Kraków Wodociągi)

### Three Transfers 

Date: Friday after 11:45:00

Source: 1014894 (Nowy Targ)

Target: 1450689 (Andrychów)

### Four Transfers

Date: Friday after 17:00:00

Source: 1014894 (Nowy Targ)

Target: 1450689 (Andrychów)

17:15 - 19:12 bus   A21 Nowy Sącz MDA, Koleje Małopolskie, Nowy Targ D.A. → Nowy Sącz MDA
20:05 - 21:53 bus   A22 Tarnów Dworzec Autobusowy, Koleje Małopolskie, Nowy Sącz MDA → Tarnów Dworzec Autobusowy
21:53 - 21:59 foot  TARNÓW
22:20 - 23:32 rail  peron II, tor 4, Koleje Małopolskie sp. z o.o., TARNÓW → KRAKÓW ZABŁOCIE
04:01 - 05:07 rail  peron I, tor 1, Koleje Małopolskie sp. z o.o., KRAKÓW ZABŁOCIE → ZATOR
05:07 - 05:10 foot  Zator PKP
07:53 - 08:25 bus   A25 Andrychów D.A., Koleje Małopolskie, Zator PKP → Andrychów Dworzec Autobusowy

---

```text
Input: Source and target stops ps, pt and
departure time τ .
// Initialization of the algorithm
foreach i do
  τi(·) ← ∞
τ∗(·) ← ∞
τ0(ps) ← τ
mark ps
foreach k ← 1, 2, . . . do 
    // Accumulate routes serving marked stops from previous round
    Clear Q
    foreach marked stop p do
        foreach route r serving p do
            if (r, p') ∈ Q for some stop p' then
                Substitute (r, p') by (r, p) in Q if p comes before p' in r
            else
                Add (r, p) to Q
        unmark p  // Traverse each route
foreach route (r, p) ∈ Q do
    t ← ⊥ // the current trip
        foreach stop pi of r beginning with p do              
            // Can the label be improved in this round? Includes local and target pruning
            if t != ⊥ and arr(t, pi) < min{τ∗(pi), τ∗(pt)} then
                τk(pi) ← τarr(t, pi)
                τ∗(pi) ← τarr(t, pi)
                mark pi          // Can we catch an earlier trip at pi?
            if τk−1(pi) ≤ τdep(t, pi) then
                t ← et(r, pi)  // Look at foot-paths
foreach marked stop p do
    foreach foot-path (p, p') ∈ F do
        τk(p') ← min{τk(p'), τk(p) + l(p, p')}
        mark p'   // Stopping criterion
if no stops are marked then
    stop
```

---

// this.footpaths['1014871'] = { ['1536334']: timeToSeconds('00:05:00') };
// this.footpaths['1536334'] = { ['1014871']: timeToSeconds('00:05:00') };
// this.footpaths['80630'] = { ['1450499']: timeToSeconds('00:05:00') };
// this.footpaths['1450499'] = { ['80630']: timeToSeconds('00:05:00') };
// this.footpaths['80416'] = { ['824492']: timeToSeconds('00:05:00') };
// this.footpaths['824492'] = { ['80416']: timeToSeconds('00:05:00') };
