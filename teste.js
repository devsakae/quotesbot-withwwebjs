const objeto = [{ name: 'Rodrigo', gols: 10 }, { name: 'Binho', gols: 0 }, { name: 'Binho', gols: 2 }, { name: 'Vitus', gols: 8 }]

console.log(objeto.sort((a, b) => a.gols + b.gols))

console.log(objeto.sort((a, b) => b.gols - a.gols))