/**
 * Seeds a believable two-market marketplace: German and Lebanese owners,
 * their cars, verified documents, and bookings spread across the lifecycle so
 * every dashboard has something real to render.
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const PASSWORD = 'karrent2026';

const DE_CITIES = [
  { name: 'Berlin', lat: 52.52, lng: 13.405 },
  { name: 'Munich', lat: 48.1351, lng: 11.582 },
  { name: 'Hamburg', lat: 53.5511, lng: 9.9937 },
  { name: 'Frankfurt am Main', lat: 50.1109, lng: 8.6821 },
  { name: 'Cologne', lat: 50.9375, lng: 6.9603 },
  { name: 'Stuttgart', lat: 48.7758, lng: 9.1829 },
];

const LB_CITIES = [
  { name: 'Beirut', lat: 33.8938, lng: 35.5018 },
  { name: 'Jounieh', lat: 33.9808, lng: 35.6178 },
  { name: 'Tripoli', lat: 34.4367, lng: 35.8497 },
  { name: 'Byblos', lat: 34.123, lng: 35.6519 },
  { name: 'Saida', lat: 33.5571, lng: 35.3729 },
  { name: 'Batroun', lat: 34.2553, lng: 35.6581 },
];

interface CarSpec {
  make: string;
  model: string;
  variant?: string;
  year: number;
  category: string;
  transmission: string;
  fuelType: string;
  seats: number;
  doors: number;
  powerHp: number;
  colour: string;
  /** Daily rate in minor units. */
  dailyRate: number;
  value: number;
  features: string[];
  description: string;
}

const DE_CARS: CarSpec[] = [
  { make: 'Volkswagen', model: 'Golf', variant: '1.5 TSI Life', year: 2022, category: 'COMPACT', transmission: 'MANUAL', fuelType: 'PETROL', seats: 5, doors: 5, powerHp: 130, colour: 'Moonstone Grey', dailyRate: 4200, value: 2200000, features: ['Apple CarPlay', 'Adaptive cruise control', 'Parking sensors', 'Winter tyres', 'Heated seats'], description: 'My daily Golf — commuter-friendly, easy to park and cheap on fuel. Winter tyres are fitted from October.' },
  { make: 'BMW', model: '3 Series', variant: '320d Touring', year: 2021, category: 'ESTATE', transmission: 'AUTOMATIC', fuelType: 'DIESEL', seats: 5, doors: 5, powerHp: 190, colour: 'Alpine White', dailyRate: 7400, value: 3600000, features: ['Leather interior', 'Panoramic roof', 'Head-up display', 'Roof rails', 'Winter tyres'], description: 'Comfortable long-distance estate. The boot swallows a family holiday and it will do Berlin to Munich on one tank.' },
  { make: 'Tesla', model: 'Model 3', variant: 'Long Range', year: 2023, category: 'ELECTRIC', transmission: 'AUTOMATIC', fuelType: 'ELECTRIC', seats: 5, doors: 4, powerHp: 440, colour: 'Deep Blue Metallic', dailyRate: 8900, value: 4200000, features: ['Autopilot', 'Supercharger access', 'Glass roof', 'Premium audio', 'Heated seats'], description: 'Charging cable and a Supercharger account come with it. About 500 km of real range in summer, closer to 380 in winter.' },
  { make: 'Mercedes-Benz', model: 'V-Class', variant: 'V 300 d', year: 2020, category: 'VAN', transmission: 'AUTOMATIC', fuelType: 'DIESEL', seats: 8, doors: 5, powerHp: 239, colour: 'Obsidian Black', dailyRate: 12500, value: 5500000, features: ['8 seats', 'Sliding doors', 'Tow bar', 'Roof rails', 'Reversing camera'], description: 'Eight real seats with luggage space behind them. Popular for airport runs and ski trips to Austria.' },
  { make: 'Porsche', model: '911', variant: 'Carrera S', year: 2021, category: 'SPORTS', transmission: 'AUTOMATIC', fuelType: 'PETROL', seats: 4, doors: 2, powerHp: 450, colour: 'Guards Red', dailyRate: 32000, value: 13500000, features: ['Sport Chrono', 'Sports exhaust', 'Bose audio', 'Ceramic brakes'], description: 'Weekend car, meticulously maintained. Minimum three days, and I ask for a short call before approving.' },
  { make: 'Fiat', model: '500', variant: '1.0 Hybrid', year: 2021, category: 'CITY', transmission: 'MANUAL', fuelType: 'HYBRID', seats: 4, doors: 3, powerHp: 70, colour: 'Gelato White', dailyRate: 2900, value: 1300000, features: ['Apple CarPlay', 'Panoramic roof', 'City mode'], description: 'Perfect for the inner ring. Fits into parking spaces nothing else will.' },
  { make: 'Audi', model: 'Q5', variant: '40 TDI quattro', year: 2022, category: 'SUV', transmission: 'AUTOMATIC', fuelType: 'DIESEL', seats: 5, doors: 5, powerHp: 204, colour: 'Mythos Black', dailyRate: 9600, value: 4800000, features: ['Quattro AWD', 'Virtual cockpit', 'Tow bar', 'Roof rails', 'Winter tyres'], description: 'All-wheel drive and winter tyres year round — good for the Alps and for anyone heading south in January.' },
  { make: 'Volkswagen', model: 'ID. Buzz', variant: 'Pro', year: 2023, category: 'VAN', transmission: 'AUTOMATIC', fuelType: 'ELECTRIC', seats: 5, doors: 5, powerHp: 204, colour: 'Candy White / Bay Leaf Green', dailyRate: 11000, value: 5400000, features: ['Electric', 'Huge boot', '360 camera', 'Heat pump'], description: 'Electric bus with a genuinely enormous boot. Comes with a Type 2 cable and an EnBW charging card.' },
  { make: 'Skoda', model: 'Octavia', variant: 'Combi 2.0 TDI', year: 2020, category: 'ESTATE', transmission: 'MANUAL', fuelType: 'DIESEL', seats: 5, doors: 5, powerHp: 150, colour: 'Steel Grey', dailyRate: 4900, value: 2000000, features: ['Roof rails', 'Tow bar', 'Parking sensors', 'Winter tyres'], description: 'Unglamorous and completely reliable. Great value for long trips.' },
  { make: 'MINI', model: 'Cooper S', variant: 'Cabrio', year: 2021, category: 'CONVERTIBLE', transmission: 'AUTOMATIC', fuelType: 'PETROL', seats: 4, doors: 2, powerHp: 178, colour: 'Chili Red', dailyRate: 8200, value: 3100000, features: ['Soft top', 'Harman Kardon audio', 'Heated seats', 'LED headlights'], description: 'Roof down along the Rhine is the whole point of this car. Summer months book up fast.' },
];

const LB_CARS: CarSpec[] = [
  { make: 'Toyota', model: 'RAV4', variant: '2.5 AWD', year: 2021, category: 'SUV', transmission: 'AUTOMATIC', fuelType: 'PETROL', seats: 5, doors: 5, powerHp: 203, colour: 'Silver', dailyRate: 5500, value: 2800000, features: ['All-wheel drive', 'Reversing camera', 'Roof rails', 'Spare wheel'], description: 'Handles the mountain roads to Faraya and the potholes on the way there. Full tank at handover.' },
  { make: 'Kia', model: 'Picanto', variant: '1.2 EX', year: 2022, category: 'CITY', transmission: 'AUTOMATIC', fuelType: 'PETROL', seats: 5, doors: 5, powerHp: 84, colour: 'Titanium Silver', dailyRate: 2500, value: 1200000, features: ['Bluetooth', 'Reversing camera', 'Low fuel consumption'], description: 'Cheapest way to get around Beirut. Tiny, easy to park in Hamra, sips fuel.' },
  { make: 'Nissan', model: 'Patrol', variant: 'SE', year: 2019, category: 'SUV', transmission: 'AUTOMATIC', fuelType: 'PETROL', seats: 7, doors: 5, powerHp: 320, colour: 'Pearl White', dailyRate: 11000, value: 4500000, features: ['7 seats', '4x4', 'Leather interior', 'Rear entertainment'], description: 'Big family car for weddings and trips to the Bekaa. Seven proper seats.' },
  { make: 'Mercedes-Benz', model: 'C-Class', variant: 'C 200', year: 2020, category: 'SEDAN', transmission: 'AUTOMATIC', fuelType: 'PETROL', seats: 5, doors: 4, powerHp: 184, colour: 'Obsidian Black', dailyRate: 7000, value: 3200000, features: ['Leather interior', 'Sunroof', 'Ambient lighting', 'Apple CarPlay'], description: 'Kept in a covered garage in Achrafieh. Ideal if you need to arrive somewhere looking the part.' },
  { make: 'Hyundai', model: 'Tucson', variant: '1.6 GDI', year: 2022, category: 'SUV', transmission: 'AUTOMATIC', fuelType: 'PETROL', seats: 5, doors: 5, powerHp: 150, colour: 'Amazon Grey', dailyRate: 4800, value: 2400000, features: ['Reversing camera', 'Lane assist', 'Wireless CarPlay', 'Spare wheel'], description: 'Comfortable and economical. Good for the coastal road and light mountain driving.' },
  { make: 'Jeep', model: 'Wrangler', variant: 'Rubicon', year: 2021, category: 'SUV', transmission: 'AUTOMATIC', fuelType: 'PETROL', seats: 5, doors: 5, powerHp: 272, colour: 'Sarge Green', dailyRate: 9500, value: 4000000, features: ['4x4 low range', 'Removable roof', 'All-terrain tyres', 'Winch'], description: 'For the Cedars, Tannourine and anywhere the tarmac gives up. Not the cheapest on fuel, worth it anyway.' },
  { make: 'Volkswagen', model: 'Golf', variant: '1.4 TSI', year: 2019, category: 'COMPACT', transmission: 'AUTOMATIC', fuelType: 'PETROL', seats: 5, doors: 5, powerHp: 150, colour: 'Tornado Red', dailyRate: 3500, value: 1500000, features: ['Apple CarPlay', 'Parking sensors', 'Cruise control'], description: 'Solid all-rounder. Serviced last month, new tyres all round.' },
  { make: 'BMW', model: 'X5', variant: 'xDrive40i', year: 2022, category: 'LUXURY', transmission: 'AUTOMATIC', fuelType: 'PETROL', seats: 5, doors: 5, powerHp: 340, colour: 'Carbon Black', dailyRate: 15000, value: 7500000, features: ['Panoramic roof', 'Harman Kardon audio', 'Massage seats', '360 camera'], description: 'Rented mainly for weddings and business visits. I ask for a video call before approving first-time renters.' },
  { make: 'Toyota', model: 'Corolla', variant: '1.8 Hybrid', year: 2023, category: 'SEDAN', transmission: 'AUTOMATIC', fuelType: 'HYBRID', seats: 5, doors: 4, powerHp: 122, colour: 'Celestite Grey', dailyRate: 4200, value: 2300000, features: ['Hybrid', 'Very low fuel use', 'Apple CarPlay', 'Lane assist'], description: 'Hybrid, so fuel stops are rare — worth a lot given petrol prices here.' },
  { make: 'Range Rover', model: 'Evoque', variant: 'P200', year: 2021, category: 'LUXURY', transmission: 'AUTOMATIC', fuelType: 'PETROL', seats: 5, doors: 5, powerHp: 200, colour: 'Fuji White', dailyRate: 12000, value: 5200000, features: ['Panoramic roof', 'Meridian audio', 'Terrain response', '360 camera'], description: 'Garage-kept in Jounieh, full service history.' },
];

interface PersonSpec {
  fullName: string;
  email: string;
  country: string;
  residenceCountry: string;
  city: string;
  dateOfBirth: string;
  ownerType?: string;
  role?: string;
  bio?: string;
  trips?: number;
  ratingSum?: number;
  ratingCount?: number;
}

const OWNERS: PersonSpec[] = [
  { fullName: 'Lukas Brandt', email: 'lukas@example.de', country: 'DE', residenceCountry: 'DE', city: 'Berlin', dateOfBirth: '1988-03-14', bio: 'Software engineer in Prenzlauer Berg. My car sits unused four days a week, so it may as well earn its keep.', trips: 41, ratingSum: 200, ratingCount: 41 },
  { fullName: 'Sophie Wagner', email: 'sophie@example.de', country: 'DE', residenceCountry: 'DE', city: 'Munich', dateOfBirth: '1991-07-22', bio: 'I keep two cars for the family and rent out whichever is free. Handover at Ostbahnhof or at home in Haidhausen.', trips: 67, ratingSum: 331, ratingCount: 67 },
  { fullName: 'Karim Nassar', email: 'karim@example.lb', country: 'LB', residenceCountry: 'LB', city: 'Beirut', dateOfBirth: '1985-11-02', bio: 'Renting cars in Beirut since 2019. I meet everyone in person and explain the roads before you drive off.', trips: 88, ratingSum: 431, ratingCount: 88 },
  { fullName: 'Rita Khoury', email: 'rita@example.lb', country: 'LB', residenceCountry: 'LB', city: 'Jounieh', dateOfBirth: '1993-05-19', bio: 'Airport pickups at any hour — a lot of my renters are flying in to see family.', trips: 34, ratingSum: 167, ratingCount: 34 },
  { fullName: 'Tobias Neumann', email: 'tobias@example.de', country: 'DE', residenceCountry: 'DE', city: 'Hamburg', dateOfBirth: '1979-01-30', ownerType: 'BUSINESS', bio: 'Small fleet operator in Hamburg. Registered business, so all rentals are invoiced with VAT.', trips: 156, ratingSum: 749, ratingCount: 156 },
  { fullName: 'Nour Fakhoury', email: 'nour@example.lb', country: 'LB', residenceCountry: 'LB', city: 'Byblos', dateOfBirth: '1990-09-08', bio: 'Byblos and Batroun. Happy to drop the car at your hotel.', trips: 22, ratingSum: 108, ratingCount: 22 },
];

const RENTERS: PersonSpec[] = [
  { fullName: 'Amira Haddad', email: 'amira@example.com', country: 'DE', residenceCountry: 'DE', city: 'Berlin', dateOfBirth: '1994-05-12', trips: 12, ratingSum: 59, ratingCount: 12 },
  { fullName: 'Jonas Weber', email: 'jonas@example.de', country: 'DE', residenceCountry: 'DE', city: 'Cologne', dateOfBirth: '2003-08-25', trips: 0 },
  { fullName: 'Layla Chidiac', email: 'layla@example.lb', country: 'LB', residenceCountry: 'FR', city: 'Beirut', dateOfBirth: '1996-02-17', trips: 5, ratingSum: 25, ratingCount: 5 },
  { fullName: 'Omar Saleh', email: 'omar@example.lb', country: 'LB', residenceCountry: 'LB', city: 'Tripoli', dateOfBirth: '1987-12-03', trips: 19, ratingSum: 91, ratingCount: 19 },
];

function daysFromNow(days: number, hour = 10): Date {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  date.setUTCHours(hour, 0, 0, 0);
  return date;
}

function yearsAgo(years: number): Date {
  const date = new Date();
  date.setUTCFullYear(date.getUTCFullYear() - years);
  return date;
}

function plateFor(country: string, index: number): string {
  if (country === 'DE') {
    const prefixes = ['B', 'M', 'HH', 'F', 'K', 'S'];
    return `${prefixes[index % prefixes.length]}-KR ${1000 + index * 7}`;
  }
  return `${100 + index}/${['B', 'G', 'M', 'T'][index % 4]} ${1000 + index * 13}`;
}

async function main() {
  console.log('Clearing existing data…');
  await prisma.$transaction([
    prisma.ledgerEntry.deleteMany(),
    prisma.message.deleteMany(),
    prisma.review.deleteMany(),
    prisma.claim.deleteMany(),
    prisma.inspection.deleteMany(),
    prisma.bookingEvent.deleteMany(),
    prisma.booking.deleteMany(),
    prisma.availabilityBlock.deleteMany(),
    prisma.document.deleteMany(),
    prisma.vehicle.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.session.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  console.log('Creating users…');

  const admin = await prisma.user.create({
    data: {
      email: 'admin@karrent.app',
      passwordHash,
      fullName: 'KarRent Operations',
      dateOfBirth: new Date('1990-01-01'),
      role: 'ADMIN',
      country: 'DE',
      residenceCountry: 'DE',
      city: 'Berlin',
      verificationStatus: 'VERIFIED',
      emailVerifiedAt: new Date(),
      phoneVerifiedAt: new Date(),
    },
  });

  const makePerson = async (spec: PersonSpec, role: string) => {
    const user = await prisma.user.create({
      data: {
        email: spec.email,
        passwordHash,
        fullName: spec.fullName,
        dateOfBirth: new Date(spec.dateOfBirth),
        role,
        ownerType: spec.ownerType ?? 'PRIVATE',
        country: spec.country,
        residenceCountry: spec.residenceCountry,
        city: spec.city,
        locale: spec.country === 'DE' ? 'de' : 'en',
        bio: spec.bio ?? null,
        phone: `${spec.country === 'DE' ? '+49' : '+961'} ${Math.floor(Math.random() * 900 + 100)} ${Math.floor(Math.random() * 900000 + 100000)}`,
        verificationStatus: 'VERIFIED',
        emailVerifiedAt: new Date(),
        phoneVerifiedAt: new Date(),
        payoutMethod: spec.country === 'DE' ? 'SEPA' : 'WHISH',
        payoutReference: spec.country === 'DE' ? 'DE89 •••• •••• 3000' : '+961 •• ••• 456',
        completedTripsAsOwner: role !== 'RENTER' ? (spec.trips ?? 0) : 0,
        completedTripsAsRenter: role === 'RENTER' ? (spec.trips ?? 0) : Math.floor((spec.trips ?? 0) / 4),
        ratingAsOwnerSum: role !== 'RENTER' ? (spec.ratingSum ?? 0) : 0,
        ratingAsOwnerCount: role !== 'RENTER' ? (spec.ratingCount ?? 0) : 0,
        ratingAsRenterSum: role === 'RENTER' ? (spec.ratingSum ?? 0) : 0,
        ratingAsRenterCount: role === 'RENTER' ? (spec.ratingCount ?? 0) : 0,
        requestsReceived: Math.round((spec.trips ?? 0) * 1.4),
        requestsAnswered: Math.round((spec.trips ?? 0) * 1.3),
        requestsApproved: spec.trips ?? 0,
        responseCount: spec.trips ?? 0,
        responseTotalMinutes: (spec.trips ?? 0) * (20 + Math.floor(Math.random() * 60)),
        createdAt: yearsAgo(role === 'RENTER' ? 1 : 3),
      },
    });

    // Identity documents — verified so the demo flows work end to end.
    const docs: { type: string; issuingCountry: string; issuedAt: Date; expiresAt: Date }[] = [
      {
        type: 'DRIVING_LICENSE',
        issuingCountry: spec.residenceCountry,
        issuedAt: yearsAgo(spec.fullName === 'Jonas Weber' ? 1 : 9),
        expiresAt: daysFromNow(365 * 8),
      },
      {
        type: spec.country === 'DE' ? 'NATIONAL_ID' : 'PASSPORT',
        issuingCountry: spec.residenceCountry,
        issuedAt: yearsAgo(4),
        expiresAt: daysFromNow(365 * 6),
      },
      {
        type: 'SELFIE_LIVENESS',
        issuingCountry: spec.residenceCountry,
        issuedAt: yearsAgo(0),
        expiresAt: daysFromNow(365 * 2),
      },
    ];

    // A renter on a non-EU licence needs an International Driving Permit.
    if (spec.residenceCountry === 'FR' && spec.country === 'LB') {
      docs.push({
        type: 'INTERNATIONAL_DRIVING_PERMIT',
        issuingCountry: 'FR',
        issuedAt: yearsAgo(0),
        expiresAt: daysFromNow(300),
      });
    }

    for (const doc of docs) {
      await prisma.document.create({
        data: {
          userId: user.id,
          type: doc.type,
          status: 'VERIFIED',
          issuingCountry: doc.issuingCountry,
          documentNumber: `${doc.type.slice(0, 3)}${Math.floor(Math.random() * 900000 + 100000)}`,
          holderName: spec.fullName,
          issuedAt: doc.issuedAt,
          expiresAt: doc.expiresAt,
          reviewedAt: yearsAgo(0),
          reviewedBy: admin.id,
        },
      });
    }

    return user;
  };

  const owners = await Promise.all(OWNERS.map((spec) => makePerson(spec, 'BOTH')));
  const renters = await Promise.all(RENTERS.map((spec) => makePerson(spec, 'RENTER')));

  console.log('Creating vehicles…');

  const vehicles: { id: string; country: string; dailyRate: number; ownerId: string }[] = [];

  const createCars = async (specs: CarSpec[], country: string, cities: typeof DE_CITIES) => {
    const marketOwners = owners.filter((owner) => owner.country === country);
    for (const [index, spec] of specs.entries()) {
      const owner = marketOwners[index % marketOwners.length];
      const city = cities.find((candidate) => candidate.name === owner.city) ?? cities[index % cities.length];
      // Public coordinates are jittered ~500 m so the exact address stays private.
      const jitter = () => (Math.random() - 0.5) * 0.012;

      const vehicle = await prisma.vehicle.create({
        data: {
          ownerId: owner.id,
          make: spec.make,
          model: spec.model,
          variant: spec.variant ?? null,
          year: spec.year,
          category: spec.category,
          transmission: spec.transmission,
          fuelType: spec.fuelType,
          seats: spec.seats,
          doors: spec.doors,
          powerHp: spec.powerHp,
          colour: spec.colour,
          licensePlate: plateFor(country, index),
          vin: `WKR${country}${String(index).padStart(11, '0')}`,
          odometerKm: 20_000 + Math.floor(Math.random() * 90_000),
          tankCapacityL: spec.fuelType === 'ELECTRIC' ? 0 : 45 + Math.floor(Math.random() * 25),
          country,
          city: city.name,
          areaLat: city.lat + jitter(),
          areaLng: city.lng + jitter(),
          exactAddress:
            country === 'DE'
              ? `${['Kastanienallee', 'Sonnenallee', 'Leipziger Straße', 'Maximilianstraße'][index % 4]} ${10 + index}, ${city.name}`
              : `${['Rue Gouraud', 'Armenia Street', 'Rue Verdun', 'Rue Bliss'][index % 4]}, ${city.name}`,
          exactLat: city.lat,
          exactLng: city.lng,
          dailyRate: spec.dailyRate,
          estimatedValue: spec.value,
          weeklyDiscount: [0.1, 0.12, 0.15, 0.18][index % 4],
          monthlyDiscount: [0.25, 0.3, 0.32][index % 3],
          cleaningFee: country === 'DE' ? 2000 : 1500,
          baseDeposit: Math.min(
            country === 'DE' ? 300_000 : 250_000,
            Math.max(country === 'DE' ? 25_000 : 20_000, Math.round(spec.value * 0.025)),
          ),
          includedKmPerDay: country === 'DE' ? 250 : 150,
          extraKmPrice: country === 'DE' ? 29 : 25,
          deliveryAvailable: index % 3 !== 0,
          deliveryPricePerKm: country === 'DE' ? 150 : 120,
          deliveryFreeRadiusKm: index % 3 === 1 ? 10 : 5,
          minRentalDays: spec.category === 'SPORTS' || spec.category === 'LUXURY' ? 3 : 1,
          maxRentalDays: spec.category === 'SPORTS' ? 14 : 45,
          advanceNoticeHours: spec.category === 'SPORTS' ? 48 : 3,
          bufferHours: 2 + (index % 3),
          instantBook: false,
          cancellationPolicy: ['FLEXIBLE', 'MODERATE', 'MODERATE', 'STRICT'][index % 4],
          smokingAllowed: false,
          petsAllowed: index % 4 === 0,
          crossBorderAllowed: country === 'DE' && index % 3 === 0,
          features: JSON.stringify(spec.features),
          photos: JSON.stringify([]),
          description: spec.description,
          status: 'LISTED',
          tripCount: Math.floor(Math.random() * 40),
          ratingSum: 0,
          ratingCount: 0,
          viewCount: Math.floor(Math.random() * 900),
        },
      });

      const ratingCount = 3 + Math.floor(Math.random() * 30);
      await prisma.vehicle.update({
        where: { id: vehicle.id },
        data: {
          ratingCount,
          ratingSum: Math.round(ratingCount * (4.3 + Math.random() * 0.7)),
        },
      });

      for (const type of ['VEHICLE_REGISTRATION', 'VEHICLE_INSURANCE', 'TECHNICAL_INSPECTION']) {
        await prisma.document.create({
          data: {
            vehicleId: vehicle.id,
            type,
            status: 'VERIFIED',
            issuingCountry: country,
            documentNumber: `${type.slice(0, 3)}${Math.floor(Math.random() * 900000 + 100000)}`,
            issuedAt: yearsAgo(1),
            expiresAt: daysFromNow(200 + Math.floor(Math.random() * 500)),
            reviewedAt: yearsAgo(0),
            reviewedBy: admin.id,
          },
        });
      }

      // A few owner-blocked windows so calendars are not suspiciously empty.
      if (index % 3 === 0) {
        await prisma.availabilityBlock.create({
          data: {
            vehicleId: vehicle.id,
            start: daysFromNow(12 + index),
            end: daysFromNow(16 + index),
            reason: 'OWNER_BLOCKED',
            note: 'Away with the car',
          },
        });
      }

      vehicles.push({ id: vehicle.id, country, dailyRate: spec.dailyRate, ownerId: owner.id });
    }
  };

  await createCars(DE_CARS, 'DE', DE_CITIES);
  await createCars(LB_CARS, 'LB', LB_CITIES);

  console.log('Creating bookings across the lifecycle…');

  const scenarios: {
    status: string;
    startOffset: number;
    days: number;
    tier: string;
    renterIndex: number;
    vehicleIndex: number;
    message: string;
  }[] = [
    { status: 'AWAITING_OWNER_APPROVAL', startOffset: 9, days: 4, tier: 'PLUS', renterIndex: 0, vehicleIndex: 1, message: 'Driving to Leipzig for a wedding — two adults, no pets. Happy to send anything else you need.' },
    { status: 'AWAITING_OWNER_APPROVAL', startOffset: 5, days: 2, tier: 'MAX', renterIndex: 1, vehicleIndex: 5, message: 'First time renting here. I can do a video call if that helps.' },
    { status: 'CONFIRMED', startOffset: 3, days: 5, tier: 'PLUS', renterIndex: 0, vehicleIndex: 0, message: 'Looking forward to it, thanks for approving so quickly.' },
    { status: 'ACTIVE', startOffset: -2, days: 6, tier: 'MAX', renterIndex: 3, vehicleIndex: 12, message: 'Trip to the Bekaa with family.' },
    { status: 'COMPLETED', startOffset: -20, days: 4, tier: 'BASIC', renterIndex: 2, vehicleIndex: 11, message: 'Visiting from Paris for a week.' },
    { status: 'COMPLETED', startOffset: -45, days: 3, tier: 'PLUS', renterIndex: 0, vehicleIndex: 2, message: 'Weekend in the Harz.' },
    { status: 'DECLINED', startOffset: 20, days: 10, tier: 'BASIC', renterIndex: 1, vehicleIndex: 4, message: 'Would love to take this for a road trip.' },
    { status: 'AWAITING_OWNER_APPROVAL', startOffset: 14, days: 3, tier: 'PLUS', renterIndex: 2, vehicleIndex: 15, message: 'Need something for the mountains — is it fine on the Faraya road in March?' },
  ];

  for (const [index, scenario] of scenarios.entries()) {
    const vehicle = vehicles[scenario.vehicleIndex % vehicles.length];
    const renter = renters[scenario.renterIndex % renters.length];
    const start = daysFromNow(scenario.startOffset);
    const end = daysFromNow(scenario.startOffset + scenario.days);
    const currency = vehicle.country === 'DE' ? 'EUR' : 'USD';

    const rental = vehicle.dailyRate * scenario.days;
    const insurance = scenario.tier === 'BASIC' ? 0 : scenario.tier === 'PLUS' ? Math.round(rental * 0.18) : Math.round(rental * 0.32);
    const cleaning = vehicle.country === 'DE' ? 2000 : 1500;
    const ownerGross = rental + cleaning;
    const serviceRate = vehicle.country === 'DE' ? 0.1 : 0.08;
    const serviceFee = Math.round((ownerGross + insurance) * serviceRate);
    const commissionRate = vehicle.country === 'DE' ? 0.15 : 0.12;
    const commission = Math.round(ownerGross * commissionRate);
    const vatRate = vehicle.country === 'DE' ? 0.19 : 0.11;
    const vat = Math.round((serviceFee + commission + insurance) * vatRate);
    const total = ownerGross + insurance + serviceFee + vat;
    const deposit = vehicle.country === 'DE' ? 60_000 : 50_000;

    const booking = await prisma.booking.create({
      data: {
        reference: `KR-${String(index + 1).padStart(4, '0')}-${vehicle.country}${index}`,
        vehicleId: vehicle.id,
        renterId: renter.id,
        ownerId: vehicle.ownerId,
        country: vehicle.country,
        startAt: start,
        endAt: end,
        status: scenario.status,
        currency,
        days: scenario.days,
        insuranceTier: scenario.tier,
        extrasJson: JSON.stringify(index % 2 === 0 ? [{ code: 'ADDITIONAL_DRIVER', quantity: 1 }] : []),
        quoteJson: JSON.stringify({
          rentalNet: ownerGross,
          insurance,
          extras: 0,
          serviceFee,
          lines: [],
          dayBreakdown: [],
          warnings: [],
          requirements: [],
        }),
        renterTotal: total,
        deposit,
        insuranceExcess: scenario.tier === 'MAX' ? 0 : scenario.tier === 'PLUS' ? 50_000 : 150_000,
        ownerGross,
        ownerCommission: commission,
        ownerPayout: ownerGross - commission,
        vatAmount: vat,
        includedKm: (vehicle.country === 'DE' ? 250 : 150) * scenario.days,
        renterMessage: scenario.message,
        approvalDeadline: scenario.status === 'AWAITING_OWNER_APPROVAL' ? new Date(Date.now() + 11 * 3_600_000) : null,
        decidedAt: ['CONFIRMED', 'ACTIVE', 'COMPLETED', 'DECLINED'].includes(scenario.status) ? new Date(Date.now() - 86_400_000) : null,
        declineReason: scenario.status === 'DECLINED' ? 'Ten days is longer than I am comfortable lending the car for.' : null,
        riskScore: [18, 52, 22, 26, 30, 20, 44, 28][index],
        riskTier: [18, 52, 22, 26, 30, 20, 44, 28][index] >= 35 ? 'MEDIUM' : 'LOW',
        paymentStatus: ['CONFIRMED', 'ACTIVE'].includes(scenario.status) ? 'AUTHORIZED' : scenario.status === 'COMPLETED' ? 'CAPTURED' : 'NONE',
        authorizedAt: ['CONFIRMED', 'ACTIVE', 'COMPLETED'].includes(scenario.status) ? new Date(Date.now() - 86_400_000) : null,
        capturedAt: ['ACTIVE', 'COMPLETED'].includes(scenario.status) ? start : null,
        createdAt: new Date(Date.now() - (index + 1) * 3_600_000 * 6),
      },
    });

    await prisma.bookingEvent.create({
      data: {
        bookingId: booking.id,
        actorId: renter.id,
        actorRole: 'RENTER',
        event: 'SUBMIT_REQUEST',
        fromStatus: 'DRAFT',
        toStatus: 'PENDING_DOCUMENTS',
        effects: JSON.stringify(['RUN_ELIGIBILITY_CHECK']),
        createdAt: booking.createdAt,
      },
    });
    await prisma.bookingEvent.create({
      data: {
        bookingId: booking.id,
        actorRole: 'SYSTEM',
        event: 'DOCUMENTS_COMPLETED',
        fromStatus: 'PENDING_DOCUMENTS',
        toStatus: 'AWAITING_OWNER_APPROVAL',
        effects: JSON.stringify(['RUN_RISK_ASSESSMENT', 'NOTIFY_OWNER', 'START_APPROVAL_TIMER']),
        createdAt: new Date(booking.createdAt.getTime() + 60_000),
      },
    });

    if (['CONFIRMED', 'ACTIVE', 'COMPLETED'].includes(scenario.status)) {
      await prisma.availabilityBlock.create({
        data: { vehicleId: vehicle.id, start, end, reason: 'BOOKED', bookingId: booking.id },
      });
    }

    await prisma.message.create({
      data: { bookingId: booking.id, senderId: renter.id, body: scenario.message, createdAt: booking.createdAt },
    });

    if (scenario.status !== 'AWAITING_OWNER_APPROVAL') {
      await prisma.message.create({
        data: {
          bookingId: booking.id,
          senderId: vehicle.ownerId,
          body:
            scenario.status === 'DECLINED'
              ? 'Sorry — ten days is longer than I can be without the car. Shorter dates would work.'
              : 'All good on my side. I will send the exact pickup spot the day before.',
          createdAt: new Date(booking.createdAt.getTime() + 3_600_000),
        },
      });
    }

    if (scenario.status === 'AWAITING_OWNER_APPROVAL') {
      await prisma.notification.create({
        data: {
          userId: vehicle.ownerId,
          kind: 'BOOKING',
          title: 'A verified renter is waiting on you',
          body: `${renter.fullName} wants your car for ${scenario.days} days.`,
          href: `/dashboard/owner/bookings/${booking.id}`,
        },
      });
    }
  }

  const counts = {
    users: await prisma.user.count(),
    vehicles: await prisma.vehicle.count(),
    bookings: await prisma.booking.count(),
    documents: await prisma.document.count(),
  };

  console.log('\nSeed complete:', counts);
  console.log(`\nSign in with any of these — password: ${PASSWORD}`);
  console.log('  Owner (DE):  lukas@example.de');
  console.log('  Owner (LB):  karim@example.lb');
  console.log('  Renter (DE): amira@example.com');
  console.log('  Renter (LB): omar@example.lb');
  console.log('  Admin:       admin@karrent.app');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
