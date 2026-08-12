-- Seed: Captivating Shimla and Manali tour from Vibrant Chandigarh (text only, no image)

INSERT INTO itinerary_templates (
  itinerary_no, name, slug, tour_package, subtitle, overview, inclusions,
  starting_from, discount_percentage, nights, days, status
) VALUES (
  1006,
  'Captivating Shimla and Manali tour from Vibrant Chandigarh',
  'captivating-shimla-and-manali-tour-from-vibrant-chandigarh',
  '5N/6D Shimla Manali from Chandigarh',
  '5 Nights / 6 Days · Chandigarh → Shimla → Manali → Chandigarh',
  'Shimla and Manali are two of the most popular hill stations in India, located in the state of Himachal Pradesh. Both are known for their natural beauty, cool climate, and adventure activities. Shimla is the capital city of Himachal Pradesh and is famous for its colonial architecture, scenic views, and Mall Road. Manali is a popular destination for honeymooners and adventure seekers, offering activities such as skiing, paragliding, and trekking. This tour will take you to both of these beautiful hill stations, starting from Chandigarh.',
  '[]'::jsonb,
  19000,
  0,
  '5',
  '6',
  'Active'
)
ON CONFLICT (itinerary_no) DO NOTHING;

INSERT INTO itinerary_template_days (itinerary_id, day_number, title, detail)
SELECT t.id, d.day_number, d.title, d.detail
FROM itinerary_templates t
JOIN (
  VALUES
    (
      1006,
      1,
      'Chandigarh to Shimla (Approx 115 Kms / 4 Hrs)',
      'Pick up from Chandigarh airport/railway station and proceed to Shimla. On arrival, check-in to the hotel. Evening free to explore The Mall Road, Ridge, Lakkar Bazaar, and Scandal Point. Overnight stay at the hotel in Shimla.'
    ),
    (
      1006,
      2,
      'Shimla - Kufri - Local Sightseeing - Shimla',
      'After breakfast, proceed to Kufri, famous for its Himalayan National Park, Pony and Yak ride, and one can see the endless Himalayan Panorama from Kufri. After lunch, visit Shimla local sightseeing which includes Jakhoo Temple, Christ Church, Gaiety Theatre, and evening at leisure. Overnight stay at the hotel in Shimla.'
    ),
    (
      1006,
      3,
      'Shimla - Kullu - Manali (Approx 260 Kms / 8 Hrs)',
      'After breakfast, check out from the hotel and drive to Manali. En route visit Kullu Valley, Pandoh Dam, and Hanogi Devi Temple. On arrival at Manali, check-in to the hotel. Evening at leisure. Overnight stay at the hotel in Manali.'
    ),
    (
      1006,
      4,
      'Manali - Local Sightseeing',
      'After breakfast, proceed for Manali local sightseeing which includes Hadimba Devi Temple, Vashisht Temple & Hot Water Springs, Club House, Tibetan Monastery, and Van Vihar. Evening at leisure. Overnight stay at the hotel in Manali.'
    ),
    (
      1006,
      5,
      'Manali - Solang Valley - Manali',
      'After breakfast, proceed for a full day excursion to Solang Valley. Enjoy adventure activities like paragliding, zorbing, skiing etc. (at your own cost). You can also visit Rohtang Pass (subject to availability of permit and extra cost). Return to Manali. Overnight stay at the hotel in Manali.'
    ),
    (
      1006,
      6,
      'Manali - Chandigarh Drop (Approx 300 Kms / 9 Hrs)',
      'After breakfast, check out from the hotel and drive back to Chandigarh. Drop at Chandigarh airport/railway station for your onward journey.'
    )
) AS d(itinerary_no, day_number, title, detail)
  ON t.itinerary_no = d.itinerary_no
ON CONFLICT (itinerary_id, day_number) DO NOTHING;

SELECT setval(
  'itinerary_templates_itinerary_no_seq',
  GREATEST((SELECT COALESCE(MAX(itinerary_no), 1000) FROM itinerary_templates), 1000)
);
