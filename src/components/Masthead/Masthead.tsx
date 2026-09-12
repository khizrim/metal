import { component$, useSignal, useVisibleTask$ } from '@builder.io/qwik';
import { Level } from '~/components/Level/Level';
import { WhatsappBaseUrl } from '~/utils/constants';
import { metalIds, metals } from '~/prices/catalog';
import { MetalImage } from '~/components/MetalImage/MetalImage';
import typo from 'ru-typo';
import { calculateTotal } from '~/utils/calc-total';
import { CTAButtons } from '~/components/CTAButtons';
import type { MastheadProps } from './Masthead.types';

const metalOptions = metalIds.map((name) => ({ name, label: metals[name].label }));

export const Masthead = component$<MastheadProps>((props) => {
  // 1. Серверная инициализация
  const defaultWeight = 5;
  const defaultMetalLabel = metalOptions[0]?.label || '';
  const initialTotal = props.prices ? calculateTotal(defaultWeight, props.prices.copper, { variation: false }) : 0;

  // 2. Сигналы состояния
  const autoUpdateTimer = useSignal<ReturnType<typeof setInterval> | null>(null);
  const weight = useSignal(defaultWeight.toString());
  const selectedMetal = useSignal(defaultMetalLabel);
  const total = useSignal(initialTotal);

  const numberWidth = useSignal('auto');
  const selectWidth = useSignal('auto');
  const numberRef = useSignal<HTMLElement>();
  const selectRef = useSignal<HTMLElement>();

  const userTouchedWeight = useSignal(false);
  const userTouchedMetal = useSignal(false);

  const flashWeight = useSignal(false);
  const flashMetal = useSignal(false);
  const whatsappHref = useSignal('');

  // Флаг первого client-side выполнения (resumability)
  const firstClientRun = useSignal(true);

  // 3. Расчёт total и формирование WhatsApp-ссылки
  useVisibleTask$(({ track }) => {
    track(() => weight.value);
    track(() => selectedMetal.value);
    track(() => props.prices);

    const w = parseFloat(weight.value) || 0;
    const metal = metalOptions.find((option) => option.label === selectedMetal.value);
    const price = metal && props.prices ? props.prices[metal.name] : 0;

    if (firstClientRun.value) {
      firstClientRun.value = false;
      // повторяем серверный расчёт — без вариации
      total.value = calculateTotal(w, price, { variation: false });
    } else {
      // дальнейшие — с вариацией ±3%
      total.value = calculateTotal(w, price, {
        variation: true,
        variationPercent: 0.03,
      });
    }

    const defaultText = 'Здравствуйте! Хочу сдать металл. Можете рассчитать стоимость?';
    const customText =
      userTouchedWeight.value || userTouchedMetal.value
        ? `Здравствуйте! Хочу сдать ${weight.value} кг ${selectedMetal.value.toLowerCase()}. Можете рассчитать стоимость?`
        : defaultText;

    whatsappHref.value = `${WhatsappBaseUrl}&text=${encodeURIComponent(customText)}&type=phone_number&app_absent=0`;
  });

  // 4. Авто-обновление каждые 8 секунд
  useVisibleTask$(() => {
    const interval = setInterval(() => {
      const randomMetal = metalOptions[Math.floor(Math.random() * metalOptions.length)];
      selectedMetal.value = randomMetal.label;
      flashMetal.value = true;

      weight.value = (Math.round((Math.random() * 49 + 1) * 2) / 2).toString();
      flashWeight.value = true;

      setTimeout(() => {
        flashWeight.value = false;
        flashMetal.value = false;
      }, 1500);
    }, 8000);

    autoUpdateTimer.value = interval;
    return () => clearInterval(interval);
  });

  // 5. Подгон ширины плашек под содержимое
  useVisibleTask$(({ track }) => {
    track(() => weight.value);
    if (numberRef.value) {
      numberWidth.value = `${numberRef.value.offsetWidth}px`;
    }
  });
  useVisibleTask$(({ track }) => {
    track(() => selectedMetal.value);
    if (selectRef.value) {
      selectWidth.value = `${selectRef.value.offsetWidth + 12}px`;
    }
  });

  // 6. Остановка интервала при ручном вводе пользователем
  useVisibleTask$(({ track }) => {
    const touched = track(() => userTouchedWeight.value) || track(() => userTouchedMetal.value);
    if (touched && autoUpdateTimer.value) {
      clearInterval(autoUpdateTimer.value);
      autoUpdateTimer.value = null;
    }
  });

  return (
    <Level as="section" class="relative mx-auto w-full">
      <h1 class="absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0">
        Прием черного и цветного металла в Москве — самовывоз и выгодные цены
      </h1>

      <div class="flex flex-col lg:flex-row items-center lg:items-start">
        <div class="flex relative sm:hidden sm:absolute top-0 right-0 lg:transform lg:-translate-y-20 lg:translate-x-1/3 w-full aspect-square lg:w-2/3 lg:block">
          <MetalImage
            metal={metalOptions.find((m) => m.label === selectedMetal.value)?.name || 'copper'}
          />
        </div>

        <div class="w-full lg:w-3/5">
          <div
            class="flex flex-wrap items-center gap-x-4 gap-y-6
                   text-[clamp(2.5rem,6vw,5rem)] font-bold leading-[1]"
          >
            <span>Сдать</span>

            {/* Вес */}
            <div class="relative inline-block align-middle" style={{ width: numberWidth.value }}>
              <span
                class={`inline-block px-4 py-2 bg-transparent tracking-tight outline-4 outline-dashed rounded-2xl outline-blue-700 whitespace-nowrap transition duration-300 ${flashWeight.value ? 'bg-yellow-100' : ''}`}
                ref={numberRef}
              >
                {weight.value || 0}
              </span>
              <input
                type="text"
                name="weight"
                aria-label="Вес металла"
                inputMode="numeric"
                class="absolute inset-0 w-full h-full px-4 py-2
                       text-transparent caret-black focus:outline-none"
                pattern="\d*"
                min={0.5}
                step={0.5}
                value={weight.value}
                onInput$={(e) => {
                  weight.value = (e.target as HTMLInputElement).value;
                  userTouchedWeight.value = true;
                }}
                style={{ width: numberWidth.value }}
              />
            </div>
            <span>кг</span>

            {/* Вид металла */}
            <div class="relative inline-block align-middle" style={{ width: selectWidth.value }}>
              <span
                class={`inline-block px-4 py-2 bg-transparent tracking-tight outline-4 outline-dashed rounded-2xl outline-blue-700 whitespace-nowrap transition duration-300 ${flashMetal.value ? 'bg-yellow-100' : ''}`}
                ref={selectRef}
              >
                {selectedMetal.value}
              </span>
              <select
                aria-label="Вид металла"
                name="type"
                class="absolute inset-0 w-full h-full text-base font-normal
                       opacity-0 cursor-pointer"
                bind:value={selectedMetal}
                onChange$={() => {
                  userTouchedMetal.value = true;
                }}
              >
                {metalOptions.map((option) => (
                  <option key={option.label} value={option.label}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Итоговая цена */}
            <span>
              {props.prices ? <>до <span class="text-red-500">{total.value.toLocaleString('ru-RU')}</span> ₽</> : <span>Цену уточните по телефону</span>}
            </span>
          </div>

          {/* Кнопки */}
          <CTAButtons phoneHref="tel:+79199947355" whatsappHref={whatsappHref.value} />

          {/* Описание */}
          <p class="mt-6 text-xl sm:text-3xl sm:leading-normal font-semibold text-gray-900">
            {typo('Получите максимальную цену, честное взвешивание и оплату сразу!')}
          </p>
          <p class="mt-2 text-sm text-gray-500">
            {typo(
              'Расчёт приблизительный и не является публичной офертой. Точный расчет возможен только после оценки',
            )}
          </p>
        </div>
      </div>
    </Level>
  );
});
