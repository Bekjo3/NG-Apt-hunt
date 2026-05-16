export interface ShuttleStop {
  address: string;
  latitude: number;
  longitude: number;
}

export const MICROSOFT_SHUTTLE_STOPS: ShuttleStop[] = [  
    // SOUTH LAKE UNION-REDMOND
  {
    address: "1101 Dexter Ave N, Seattle, WA 98109",
    latitude: 47.62980734276122,
    longitude: -122.34266682837044,
  },
  {
    address: "Harrison St & Boren Ave N, Seattle, WA 98109",
    latitude: 47.62230049375312,
    longitude: -122.33575511172104,
  },
  {
    address: "Lenora St & 6th Ave, Seattle, WA 98121",
    latitude: 47.61526491802558,
    longitude: -122.33961547123688,
  },
  // QUEEN ANNE-BELTOWN
  {
    address: "9 W McGraw St, Seattle, WA 98119",
    latitude: 47.63940425805278,
    longitude: -122.357380628887,
  },
  {
    address: "W Comstock St & Queen Anne Ave N, Seattle, WA 98109",
    latitude: 47.63051823289724,
    longitude: -122.35663452890466,
  },
  {
    address: "Queen Anne Ave N & W Harrison St, Seattle, WA 98109",
    latitude: 47.62199362008843,
    longitude: -122.35683197123079,
  },
  {
    address: "Cedar St & 2nd Ave, Seattle, WA 98121",
    latitude: 47.616603643865375,
    longitude:  -122.34986523080397,
  },

  // FREMONT-WALLINGFORD
  {
    address: "Phinney Ave N & N 36th St, Seattle, WA 98103",
    latitude: 47.65236180865413,
    longitude:  -122.35447997122459,
  },
  {
    address: "N 35th St & Woodland Park Ave N, Seattle, WA 98103",
    latitude: 47.64958227628223,
    longitude: -122.34359708474963, 
  },
  {
    address: "N 34th St & Wallingford Ave N, Seattle, WA 98103",
    latitude: 47.64811485045326,
    longitude:  -122.33634194238928,
  },
  {
    address: "N 45th St & Stone Way N, Seattle, WA 98103",
    latitude: 47.66145723383623,
    longitude:  -122.34222450190839,
  },
  {
    address: "N 45th St & Bagley Ave N, Seattle, WA 98103",
    latitude: 47.661586027253,
    longitude: -122.33260561550597,
  },

  // WEST SEATTLE 
  {
    address: "California Ave SW, Seattle, WA 98116",
    latitude: 47.55032488268827,
    longitude: -122.38710570006135,
  },
  {
    address: "California Ave SW & SW Hill St, Seattle, WA 98116",
    latitude: 47.58540775823869,
    longitude:  -122.3864225786046,
  }, 
  {
    address: "4400 42nd Ave SW, Seattle, WA 98116",
    latitude: 47.564352915291636,
    longitude:  -122.3850630693144,
  }
];

// exports.MICROSOFT_SHUTTLE_STOPS = MICROSOFT_SHUTTLE_STOPS;  was using it when the modulde was common js
