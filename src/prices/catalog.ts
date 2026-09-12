export const metals = {
  copper: { title: 'Медь', label: 'меди' },
  cables: { title: 'Кабель', label: 'кабеля' },
  brass: { title: 'Латунь', label: 'латуни' },
  bronze: { title: 'Бронза', label: 'бронзы' },
  aluminium: { title: 'Алюминий', label: 'алюминия' },
  can: { title: 'Алюминиевая банка', label: 'банки' },
  stainless: { title: 'Нержавейка', label: 'нержавейки' },
  lead: { title: 'Свинец', label: 'свинца' },
  battery: { title: 'Аккумулятор', label: 'аккумулятора' },
  scrap: { title: 'Металлолом', label: 'металлолома' },
  titanium: { title: 'Титан', label: 'титана' },
  stannum: { title: 'Олово', label: 'олова' },
  pos: { title: 'ПОС', label: 'поса' },
  hss: { title: 'Быстрорез', label: 'быстрореза' },
  nichrome: { title: 'Нихром', label: 'нихрома' },
  tantalum: { title: 'Тантал', label: 'тантала' },
  molybdenum: { title: 'Молибден', label: 'молибдена' },
  tungsten: { title: 'ВК/ТК', label: 'вк/тк' },
  niobium: { title: 'Ниобий', label: 'ниобия' },
  cobalt: { title: 'Кобальт', label: 'кобальта' },
  bismuth: { title: 'Висмут', label: 'висмута' },
  babbitt: { title: 'Баббит', label: 'бабита' },
};

export const isMetalId = (value: string): value is keyof typeof metals =>
  Object.hasOwn(metals, value);

export const metalIds = Object.keys(metals).filter(isMetalId);
