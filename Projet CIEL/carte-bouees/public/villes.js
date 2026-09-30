// Villes et îles de repère pour dire « à côté de quelle ville ou pays » se trouve une bouée (nom|pays|latitude|longitude)
const VILLES = `Miami|États-Unis|25.76|-80.19
New York|États-Unis|40.71|-74.01
Boston|États-Unis|42.36|-71.06
Norfolk|États-Unis|36.85|-76.29
Charleston|États-Unis|32.78|-79.93
Galveston|États-Unis|29.30|-94.80
New Orleans|États-Unis|29.95|-90.07
Tampa|États-Unis|27.95|-82.46
San Diego|États-Unis|32.72|-117.16
Los Angeles|États-Unis|34.05|-118.24
San Francisco|États-Unis|37.77|-122.42
Astoria|États-Unis|46.19|-123.83
Seattle|États-Unis|47.61|-122.33
Sitka|États-Unis (Alaska)|57.05|-135.33
Kodiak|États-Unis (Alaska)|57.79|-152.41
Dutch Harbor|États-Unis (Alaska)|53.89|-166.54
Honolulu|États-Unis (Hawaï)|21.31|-157.86
Hilo|États-Unis (Hawaï)|19.72|-155.09
Halifax|Canada|44.65|-63.57
Saint-Jean de Terre-Neuve|Canada|47.56|-52.71
Vancouver|Canada|49.28|-123.12
Prince Rupert|Canada|54.31|-130.32
Nuuk|Groenland|64.18|-51.72
Reykjavik|Islande|64.15|-21.94
Hamilton|Bermudes|32.29|-64.78
Nassau|Bahamas|25.05|-77.35
San Juan|Porto Rico|18.47|-66.11
La Havane|Cuba|23.11|-82.37
Kingston|Jamaïque|17.97|-76.79
Fort-de-France|Martinique|14.60|-61.07
Bridgetown|Barbade|13.10|-59.61
Cancún|Mexique|21.16|-86.85
Veracruz|Mexique|19.17|-96.13
Acapulco|Mexique|16.85|-99.92
La Paz|Mexique|24.14|-110.31
Panama|Panama|8.98|-79.52
Cayenne|Guyane française|4.94|-52.33
La Guaira|Venezuela|10.60|-66.93
Fortaleza|Brésil|-3.73|-38.53
Recife|Brésil|-8.05|-34.88
Salvador|Brésil|-12.97|-38.50
Rio de Janeiro|Brésil|-22.91|-43.17
Montevideo|Uruguay|-34.90|-56.19
Buenos Aires|Argentine|-34.60|-58.38
Ushuaïa|Argentine|-54.80|-68.30
Punta Arenas|Chili|-53.16|-70.91
Valparaíso|Chili|-33.05|-71.62
Antofagasta|Chili|-23.65|-70.40
Île de Pâques|Chili|-27.15|-109.43
Lima|Pérou|-12.05|-77.04
Guayaquil|Équateur|-2.17|-79.92
Îles Galápagos|Équateur|-0.74|-90.31
Lisbonne|Portugal|38.72|-9.14
Ponta Delgada|Açores (Portugal)|37.74|-25.67
Funchal|Madère (Portugal)|32.65|-16.91
Las Palmas|Canaries (Espagne)|28.12|-15.43
Vigo|Espagne|42.24|-8.72
Barcelone|Espagne|41.39|2.17
Brest|France|48.39|-4.49
Biarritz|France|43.48|-1.56
Marseille|France|43.30|5.37
Le Havre|France|49.49|0.11
Plymouth|Royaume-Uni|50.37|-4.14
Aberdeen|Royaume-Uni|57.15|-2.09
Lerwick|Îles Shetland (Royaume-Uni)|60.15|-1.15
Dublin|Irlande|53.35|-6.26
Galway|Irlande|53.27|-9.05
Amsterdam|Pays-Bas|52.37|4.90
Hambourg|Allemagne|53.55|9.99
Copenhague|Danemark|55.68|12.57
Oslo|Norvège|59.91|10.75
Bergen|Norvège|60.39|5.32
Tromsø|Norvège|69.65|18.96
Stockholm|Suède|59.33|18.07
Helsinki|Finlande|60.17|24.94
Gdansk|Pologne|54.35|18.65
Mourmansk|Russie|68.97|33.09
Gênes|Italie|44.41|8.93
Palerme|Italie|38.12|13.36
Athènes|Grèce|37.98|23.73
Istanbul|Turquie|41.01|28.98
Odessa|Ukraine|46.48|30.73
Alger|Algérie|36.75|3.06
Tunis|Tunisie|36.81|10.18
Tripoli|Libye|32.89|13.19
Alexandrie|Égypte|31.20|29.92
Casablanca|Maroc|33.57|-7.59
Dakar|Sénégal|14.72|-17.47
Praia|Cap-Vert|14.93|-23.51
Freetown|Sierra Leone|8.48|-13.23
Abidjan|Côte d'Ivoire|5.36|-4.01
Lagos|Nigéria|6.52|3.38
Libreville|Gabon|0.39|9.45
Luanda|Angola|-8.84|13.23
Walvis Bay|Namibie|-22.96|14.51
Le Cap|Afrique du Sud|-33.92|18.42
Durban|Afrique du Sud|-29.86|31.02
Maputo|Mozambique|-25.97|32.57
Dar es Salaam|Tanzanie|-6.79|39.21
Mombasa|Kenya|-4.04|39.67
Mogadiscio|Somalie|2.05|45.32
Jamestown|Sainte-Hélène|-15.93|-5.72
Saint-Denis|La Réunion|-20.88|55.45
Port-Louis|Maurice|-20.16|57.50
Toamasina|Madagascar|-18.15|49.41
Victoria|Seychelles|-4.62|55.45
Djeddah|Arabie saoudite|21.49|39.19
Mascate|Oman|23.59|58.41
Dubaï|Émirats arabes unis|25.20|55.27
Karachi|Pakistan|24.86|67.01
Mumbai|Inde|19.08|72.88
Chennai|Inde|13.08|80.27
Colombo|Sri Lanka|6.93|79.86
Malé|Maldives|4.18|73.51
Yangon|Myanmar|16.87|96.20
Phuket|Thaïlande|7.88|98.39
Singapour|Singapour|1.35|103.82
Jakarta|Indonésie|-6.21|106.85
Denpasar|Indonésie|-8.65|115.22
Manille|Philippines|14.60|120.98
Hô Chi Minh-Ville|Viêt Nam|10.82|106.63
Hong Kong|Chine|22.32|114.17
Shanghai|Chine|31.23|121.47
Qingdao|Chine|36.07|120.38
Taipei|Taïwan|25.03|121.57
Séoul|Corée du Sud|37.57|126.98
Busan|Corée du Sud|35.18|129.08
Tokyo|Japon|35.68|139.69
Osaka|Japon|34.69|135.50
Sapporo|Japon|43.06|141.35
Naha|Okinawa (Japon)|26.21|127.68
Vladivostok|Russie|43.12|131.89
Petropavlovsk-Kamtchatski|Russie|53.04|158.65
Sydney|Australie|-33.87|151.21
Brisbane|Australie|-27.47|153.03
Perth|Australie|-31.95|115.86
Darwin|Australie|-12.46|130.84
Hobart|Australie|-42.88|147.33
Auckland|Nouvelle-Zélande|-36.85|174.76
Wellington|Nouvelle-Zélande|-41.29|174.78
Nouméa|Nouvelle-Calédonie|-22.27|166.46
Suva|Fidji|-18.14|178.44
Papeete|Polynésie française|-17.54|-149.57
Apia|Samoa|-13.83|-171.76
Pago Pago|Samoa américaines|-14.28|-170.70
Nuku'alofa|Tonga|-21.14|-175.20
Port Moresby|Papouasie-Nouvelle-Guinée|-9.44|147.18
Honiara|Îles Salomon|-9.43|159.95
Port-Vila|Vanuatu|-17.73|168.32
Tarawa|Kiribati|1.45|173.03
Kiritimati|Kiribati|1.87|-157.40
Majuro|Îles Marshall|7.09|171.38
Hagåtña|Guam|13.44|144.79
Kolonia|Micronésie|6.96|158.21
Koror|Palaos|7.34|134.48
Rarotonga|Îles Cook|-21.23|-159.78`.split('\n').map((l) => { const [n, p, a, o] = l.split('|'); return { n, p, lat: +a, lon: +o }; });

// Phrase du type « À environ 240 km au sud-est de Miami (États-Unis) »
function pres(lat, lon) {
  const rad = Math.PI / 180;
  let best = null, dist = Infinity;
  for (const v of VILLES) {
    const a = Math.sin(((v.lat - lat) * rad) / 2) ** 2 + Math.cos(lat * rad) * Math.cos(v.lat * rad) * Math.sin(((v.lon - lon) * rad) / 2) ** 2;
    const d = 12742 * Math.asin(Math.sqrt(a));
    if (d < dist) { dist = d; best = v; }
  }
  const l1 = best.lat * rad, l2 = lat * rad, dl = (lon - best.lon) * rad;
  const brg = (Math.atan2(Math.sin(dl) * Math.cos(l2), Math.cos(l1) * Math.sin(l2) - Math.sin(l1) * Math.cos(l2) * Math.cos(dl)) / rad + 360) % 360;
  const dir = ['nord', 'nord-est', 'est', 'sud-est', 'sud', 'sud-ouest', 'ouest', 'nord-ouest'][Math.round(brg / 45) % 8];
  if (dist < 15) return `Tout près de ${best.n} (${best.p})`;
  const km = dist < 1000 ? Math.round(dist / 10) * 10 : Math.round(dist / 50) * 50;
  return `À environ ${km.toLocaleString('fr-FR')} km au ${dir} de ${best.n} (${best.p})`;
}
