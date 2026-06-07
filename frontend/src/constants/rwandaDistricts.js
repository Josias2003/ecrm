/** All 30 districts of Rwanda — shared across forms, GIS, and filters. */

export const RWANDA_DISTRICTS = [
  { name: 'Gasabo', province: 'Kigali', lat: -1.930, lng: 30.110, sectors: ['Remera', 'Kacyiru', 'Kimironko', 'Gisozi', 'Kinyinya', 'Jabana'] },
  { name: 'Kicukiro', province: 'Kigali', lat: -1.975, lng: 30.105, sectors: ['Niboye', 'Kanombe', 'Nyanza', 'Gahanga', 'Masaka', 'Gatenga'] },
  { name: 'Nyarugenge', province: 'Kigali', lat: -1.960, lng: 30.060, sectors: ['Nyamirambo', 'Biryogo', 'Muhima', 'Kimisagara', 'Gitega', 'Mageragere'] },
  { name: 'Bugesera', province: 'Eastern', lat: -2.155, lng: 30.240, sectors: ['Nyamata', 'Rilima', 'Ntarama', 'Mareba', 'Mayange', 'Kamabuye'] },
  { name: 'Gatsibo', province: 'Eastern', lat: -1.672, lng: 30.435, sectors: ['Kabarore', 'Gatunda', 'Rugarama', 'Rwimbogo', 'Kageyo', 'Remera'] },
  { name: 'Kayonza', province: 'Eastern', lat: -1.858, lng: 30.620, sectors: ['Kayonza', 'Mukarange', 'Rukara', 'Murundi', 'Rwinkwavu', 'Gahini'] },
  { name: 'Kirehe', province: 'Eastern', lat: -2.165, lng: 30.545, sectors: ['Kirehe', 'Mahama', 'Mpanga', 'Nasho', 'Nyamugari', 'Gahara'] },
  { name: 'Ngoma', province: 'Eastern', lat: -2.180, lng: 30.350, sectors: ['Kibungo', 'Rukira', 'Sake', 'Zaza', 'Remera', 'Mutenderi'] },
  { name: 'Nyagatare', province: 'Eastern', lat: -1.292, lng: 30.325, sectors: ['Nyagatare', 'Matimba', 'Karangazi', 'Rwempasha', 'Tabagwe', 'Mimuri'] },
  { name: 'Rwamagana', province: 'Eastern', lat: -1.949, lng: 30.435, sectors: ['Rwamagana', 'Musha', 'Fumbwe', 'Karenge', 'Rubona', 'Nzige'] },
  { name: 'Burera', province: 'Northern', lat: -1.472, lng: 29.785, sectors: ['Bungwe', 'Butaro', 'Cyanika', 'Gahunga', 'Gatebe', 'Kinoni'] },
  { name: 'Gakenke', province: 'Northern', lat: -1.702, lng: 29.785, sectors: ['Gakenke', 'Gashenyi', 'Janja', 'Karambo', 'Mugunga', 'Ruli'] },
  { name: 'Gicumbi', province: 'Northern', lat: -1.578, lng: 30.065, sectors: ['Byumba', 'Bukure', 'Cyumba', 'Kageyo', 'Rukomo', 'Rushaki'] },
  { name: 'Musanze', province: 'Northern', lat: -1.499, lng: 29.635, sectors: ['Muhoza', 'Kinigi', 'Remera', 'Busogo', 'Gacaca', 'Nkotsi'] },
  { name: 'Rulindo', province: 'Northern', lat: -1.812, lng: 30.052, sectors: ['Kinihira', 'Bushoki', 'Buyoga', 'Cyinzuzi', 'Murambi', 'Ngoma'] },
  { name: 'Gisagara', province: 'Southern', lat: -2.578, lng: 29.912, sectors: ['Muganza', 'Musha', 'Nyanza', 'Save', 'Gikonko', 'Mamba'] },
  { name: 'Huye', province: 'Southern', lat: -2.596, lng: 29.738, sectors: ['Huye', 'Ngoma', 'Ruhashya', 'Simbi', 'Tumba', 'Karama'] },
  { name: 'Kamonyi', province: 'Southern', lat: -2.002, lng: 29.878, sectors: ['Runda', 'Gacurabwenge', 'Kayenzi', 'Musambira', 'Nyamiyaga', 'Rugalika'] },
  { name: 'Muhanga', province: 'Southern', lat: -2.082, lng: 29.755, sectors: ['Muhanga', 'Cyeza', 'Kabacuzi', 'Nyamabuye', 'Shyogwe', 'Rongi'] },
  { name: 'Nyamagabe', province: 'Southern', lat: -2.478, lng: 29.552, sectors: ['Nyamagabe', 'Buruhukiro', 'Gatare', 'Kibirizi', 'Mugano', 'Tare'] },
  { name: 'Nyanza', province: 'Southern', lat: -2.352, lng: 29.752, sectors: ['Busasamana', 'Busoro', 'Cyabakamyi', 'Kibirizi', 'Mukingo', 'Nyagisozi'] },
  { name: 'Nyaruguru', province: 'Southern', lat: -2.478, lng: 29.652, sectors: ['Kibeho', 'Cyahinda', 'Mata', 'Munini', 'Ngera', 'Ruheru'] },
  { name: 'Ruhango', province: 'Southern', lat: -2.252, lng: 29.752, sectors: ['Ruhango', 'Bweramana', 'Byimana', 'Kabagali', 'Kinazi', 'Mbuye'] },
  { name: 'Karongi', province: 'Western', lat: -2.062, lng: 29.352, sectors: ['Karongi', 'Bwishyura', 'Gishyita', 'Mubuga', 'Murambi', 'Rugabano'] },
  { name: 'Ngororero', province: 'Western', lat: -1.862, lng: 29.552, sectors: ['Ngororero', 'Bwira', 'Gatumba', 'Hindiro', 'Matyazo', 'Sovu'] },
  { name: 'Nyabihu', province: 'Western', lat: -1.702, lng: 29.502, sectors: ['Jomba', 'Jenda', 'Kabatwa', 'Karago', 'Mukamira', 'Rambura'] },
  { name: 'Nyamasheke', province: 'Western', lat: -2.352, lng: 29.052, sectors: ['Bushekeri', 'Bushenge', 'Cyato', 'Kagano', 'Mahembe', 'Rangiro'] },
  { name: 'Rubavu', province: 'Western', lat: -1.702, lng: 29.252, sectors: ['Gisenyi', 'Bugeshi', 'Kanama', 'Mudende', 'Nyakiriba', 'Rugerero'] },
  { name: 'Rutsiro', province: 'Western', lat: -1.952, lng: 29.352, sectors: ['Rutsiro', 'Gihango', 'Kigeyo', 'Manihira', 'Mukura', 'Murunda'] },
  { name: 'Rusizi', province: 'Western', lat: -2.478, lng: 28.902, sectors: ['Kamembe', 'Bugarama', 'Butare', 'Gihundwe', 'Muganza', 'Nkanka'] },
]

export const DISTRICT_NAMES = RWANDA_DISTRICTS.map(d => d.name)

export const PROVINCE_COLORS = {
  Kigali: '#2563EB',
  Eastern: '#10B981',
  Northern: '#8B5CF6',
  Southern: '#F59E0B',
  Western: '#06B6D4',
}

export const RWANDA_CENTER = [-1.94, 29.87]
export const RWANDA_BOUNDS = [[-2.84, 28.85], [-1.05, 30.90]]

export function sectorsFor(district) {
  const d = RWANDA_DISTRICTS.find(x => x.name === district)
  return d?.sectors || []
}

export function provinceFor(district) {
  const d = RWANDA_DISTRICTS.find(x => x.name === district)
  return d?.province || 'Rwanda'
}

export function districtColor(district) {
  return PROVINCE_COLORS[provinceFor(district)] || '#64748B'
}
