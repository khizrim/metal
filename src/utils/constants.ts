import type { metalImages } from '~/components/MetalImage';

type MetalProps = {
  label: string;
  price: number;
  name: keyof typeof metalImages;
};

export const WhatsappBaseUrl = `https://api.whatsapp.com/send/?phone=79199947355`;

export const metalOptions: MetalProps[] = [
  { label: 'меди', price: 999, name: 'copper' },
  { label: 'кабеля', price: 888, name: 'cables' },
  { label: 'латуни', price: 666, name: 'brass' },
  { label: 'бронзы', price: 777, name: 'bronze' },
  { label: 'алюминия', price: 222, name: 'aluminium' },
  { label: 'банки', price: 88.8, name: 'can' },
  { label: 'нержавейки', price: 55.5, name: 'stainless' },
  { label: 'свинца', price: 111, name: 'lead' },
  { label: 'аккумулятора', price: 55.5, name: 'battery' },
  { label: 'металлолома', price: 33333, name: 'scrap' },
  { label: 'титана', price: 200, name: 'titanium' },
  { label: 'олова', price: 2700, name: 'stannum' },
  { label: 'поса', price: 2600, name: 'pos' },
  { label: 'быстрореза', price: 888, name: 'hss' },
  { label: 'нихрома', price: 800, name: 'nichrome' },
  { label: 'тантала', price: 18000, name: 'tantalum' },
  { label: 'молибдена', price: 3750, name: 'molybdenum' },
  { label: 'вк/тк', price: 8888, name: 'tungsten' },
  { label: 'ниобия', price: 3100, name: 'niobium' },
  { label: 'кобальта', price: 950, name: 'cobalt' },
  { label: 'висмута', price: 600, name: 'bismuth' },
  { label: 'бабита', price: 1000, name: 'babbitt' },
];
