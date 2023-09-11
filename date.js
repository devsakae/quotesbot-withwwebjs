ani = [
  {
    name: 'Rodrigo Sakae',
    birthday: '10/05/1983',
    position: 'Atacante',
},
{
  name: 'Catarina Hobold Sakae',
  birthday: '18/12/2020',
  position: 'Zagueira',
},
{
  name: 'Nilton Shigueo Sakae',
  birthday: '08/09/1956',
  position: 'Volante',
}
];

let resp = 'Lista de aniversariantes!!'

console.log(ani[0]);
ani.sort((a, b) => {
  if (a.name < b.name) return -1;
  if (a.name > b.name) return 1;
  return 0;
})
console.log(ani[0]);
// newani.map((old) => resp = resp.concat(old.name))

// console.log(resp)