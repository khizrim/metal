import { component$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { routeLoader$ } from '@builder.io/qwik-city';
import { readPublicPrices } from '~/prices/netlify.server';
import { Masthead } from '~/components/Masthead';
import { WhatWeAccept } from '~/components/WhatWeAccept';
import { OurApproach } from '~/components/OurApproach';
import { WhyChooseUs } from '~/components/WhyChooseUs';
import { HowWeWork } from '~/components/HowWeWork';
import { YandexReviews } from '~/components/YandexReviews';
import { MapWithLocation } from '~/components/MapWithLocation';

export const usePrices = routeLoader$(async (event) => {
  event.headers.set('Cache-Control', 'no-store');
  event.headers.set('CDN-Cache-Control', 'no-store');
  event.headers.set('Netlify-CDN-Cache-Control', 'no-store');
  return readPublicPrices(event.platform.deploy);
});

export default component$(() => {
  const prices = usePrices();
  return (
    <>
      <Masthead prices={prices.value} />
      <WhatWeAccept />
      <OurApproach />
      <WhyChooseUs />
      <MapWithLocation />
      <HowWeWork />
      <YandexReviews />
    </>
  );
});

export const head: DocumentHead = {
  title: 'Скупрум — приём металлолома в Москве дорого и быстро',
  meta: [
    {
      name: 'description',
      content:
        'Скупрум — приём меди, кабеля и цветного металла в Москве. Высокие цены, точное взвешивание, выезд и моментальная оплата.',
    },
    {
      name: 'keywords',
      content:
        'скуprum, скупрум, прием металла в Москве, сдать металлолом, сдать медь дорого, скупка кабеля, прием меди и латуни, цена на металлолом, вывоз металлолома, сдать кабель с выездом, скупка меди, цветной металл Москва, где сдать медь, пункты приема металла, прием цветного металла, скупка алюминия, прием черного металла, сколько стоит медь за кг, прием лома, металлолом с выездом и оплатой, прием металла цена за кг, утилизация кабеля',
    },
    {
      name: 'robots',
      content: 'index, follow',
    },
    {
      name: 'viewport',
      content: 'width=device-width, initial-scale=1.0',
    },
    {
      property: 'og:title',
      content: 'Скупрум — приём металлолома в Москве дорого и быстро',
    },
    {
      property: 'og:description',
      content:
        'Скупрум — сдайте медь, кабель, цветной металл по максимальной цене с вывозом и оплатой в день обращения.',
    },
    {
      property: 'og:type',
      content: 'website',
    },
    {
      property: 'og:url',
      content: 'https://skuprum.ru',
    },
    {
      property: 'og:image',
      content: 'https://skuprum.ru/og.png',
    },
    {
      name: 'twitter:card',
      content: 'summary_large_image',
    },
    {
      name: 'twitter:title',
      content: 'Скупрум — приём металлолома в Москве выгодно и честно',
    },
    {
      name: 'twitter:description',
      content:
        'Скупрум — приём меди, кабеля и других металлов по высоким ценам. Оставьте заявку — приедем в день обращения!',
    },
    {
      name: 'twitter:image',
      content: 'https://skuprum.ru/og.png',
    },
    {
      name: 'theme-color',
      content: '#fff',
    },
  ],
  links: [
    {
      rel: 'preconnect',
      href: 'https://mc.yandex.ru',
    },
    {
      rel: 'preconnect',
      href: 'https://yastatic.net',
    },
  ],
  scripts: [
    {
      key: 'yandex-metrika-deferred',
      props: {
        type: 'text/javascript',
      },
      script: `
        document.addEventListener('DOMContentLoaded', function () {
          (function (m, e, t, r, i, k, a) {
            m[i] = m[i] || function () { (m[i].a = m[i].a || []).push(arguments) };
            m[i].l = 1 * new Date();
            for (var j = 0; j < document.scripts.length; j++) {
              if (document.scripts[j].src === r) return;
            }
            k = e.createElement(t), a = e.getElementsByTagName(t)[0], k.async = 1, k.src = r, a.parentNode.insertBefore(k, a)
          })(window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");

          ym(101890997, "init", {
            clickmap: true,
            trackLinks: true,
            accurateTrackBounce: true
          });
        });
      `,
    },
    {
      key: 'local-business',
      props: {
        type: 'application/ld+json',
      },
      script: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'LocalBusiness',
        name: 'Скупрум — приём металла',
        image: 'https://skuprum.ru',
        url: 'https://skuprum.ru',
        telephone: '8 (499) 390-79-15',
        email: '9264106363@mail.ru',
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'Москва',
          streetAddress: 'ул. Смольная, д. 2',
          postalCode: '125493',
          addressCountry: 'RU',
        },
        openingHoursSpecification: {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
          opens: '08:00',
          closes: '23:00',
        },
        priceRange: '₽',
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: '4.7',
          reviewCount: '25',
        },
      }),
    },
  ],
};
