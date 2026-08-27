export const WARD_DATA: Record<string, string[]> = {
  "Chathamangalam Grama Panchayath": [
    "1 Pullanoor", "2 Malayamma", "3 Muttayam", "4 East Malayamma", "5 Kalanthodu",
    "6 Kattangal", "7 Parathapoyil", "8 Erimala", "9 Nayarkuzhi", "10 Pazhoor",
    "11 Koolimadu", "12 Arayangod", "13 Puthiyadam", "14 Vellalasseri", "15 Choolur",
    "16 Chettikkadavu", "17 Vellanur", "18 Koozhakkod", "19 Kozhimanna", "20 Chathamangalam",
    "21 Vengeri Madam", "22 Valiya Poyil", "23 Chenoth", "24 Pullavoor"
  ],
  "Kunnamangalam Grama Panchayath": [
    "1 Pathimangalam", "2 Padanilam", "3 Pilassery", "4 Poyya", "5 Nochippoyil",
    "6 Choolam Vayal", "7 Muriyanal", "8 Kunnamangalam East", "9 Chethukadavu North", "10 Chethukadavu",
    "11 Kurikkathur", "12 Chathankavu South", "13 Chathankavu North", "14 Kunnamangalam", "15 Cherinjal",
    "16 Paingottupuram East", "17 Paingottupuram West", "18 Paingottupuram", "19 Kolayithazham", "20 Karanthoor",
    "21 Karanthoor East", "22 Karanthoor North", "23 Veloor", "24 Pantheer Padam"
  ],
  "Mavoor Grama Panchayath": [
    "1 Malapram", "2 Valayannur", "3 Cheruppa", "4 Kuttikkadavu", "5 Thengilakadavu",
    "6 Mecherikkunnu", "7 Kanni Paramb", "8 Palliyol", "9 Aduvad", "10 Kaniyath",
    "11 Thathur Poyil", "12 Mavoor South", "13 Mavoor North", "14 Parammal East", "15 Parammal West",
    "16 Kalpalli", "17 Aayamkulam", "18 Urkadavu", "19 Manakkadu"
  ],
  "Olavanna Grama Panchayath": [
    "1 Iringallur", "2 Palazhi Pala", "3 Palazhi Pala East", "4 Palazhi West", "5 Palazhi East",
    "6 Pantheerankave North", "7 Pantheerankave South", "8 Poolenkara", "9 Muthuvanathara", "10 Manakkadave",
    "11 Kodal Nadakkave", "12 Moorkkanad", "13 Chathothara", "14 Kodinattumukku", "15 Palakurumba",
    "16 Olavanna", "17 Thondilakkadavu", "18 Kayatti", "19 Odumbra", "20 Kambiliparamb",
    "21 Kunnathupalam", "22 M G Nagar", "23 Mathara", "24 Konthanari"
  ],
  "Perumanna Grama Panchayath": [
    "1 Payyadimethal", "2 Payyadithazham", "3 Parakkottuthazham", "4 Perumanna North", "5 Arathilparamb",
    "6 Perumanpura West", "7 Perumanpura East", "8 Thayyilthazham", "9 Parammal", "10 Kottayithazham",
    "11 Vellayikkode", "12 Perumanna South", "13 Perumanna Town", "14 Parakkandam", "15 Puthoormadam",
    "16 Illath Thazham", "17 Vallikkunnu", "18 Ambiloli", "19 Changaramkunnu", "20 Panniyoorkulam",
    "21 Parakkulam", "22 Nedumparamb"
  ],
  "Peruvayal Grama Panchayath": [
    "1 Peringolam School", "2 Peringolam", "3 Mundakkal", "4 Cherukulathur", "5 Pariyangad",
    "6 Pariyangad Thadayi", "7 Konarambu", "8 Peruvayal", "9 Kayalam", "10 Pallithazham",
    "11 Kalleri", "12 Poovattuparamba", "13 Aluvan Pilakkal", "14 Anakkuzhikkara", "15 Thadapparambu",
    "16 Mayooramkunnu", "17 Perya", "18 Keezhmadu", "19 Vellipparamba", "20 Vellipparamba 5Th Mile",
    "21 Vellipparamba 6 Th Mile", "22 Areekkal", "23 Goshalikkunnu", "24 Kuttikkattur"
  ]
};

export const LOCAL_BODIES = Object.keys(WARD_DATA);

// Pre-compute reverse mapping for fast lookups
export const WARD_TO_LOCAL_BODY: Record<string, string> = {};
Object.entries(WARD_DATA).forEach(([localBody, wards]) => {
  wards.forEach(ward => {
    WARD_TO_LOCAL_BODY[ward] = localBody;
  });
});
