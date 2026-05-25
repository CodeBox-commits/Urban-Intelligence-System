-- Demo seed data for UrbanIQ.
-- Run after schema.sql. Dates are relative to current_date so the dashboard filters stay populated.

delete from public.aqi_data
where state = 'Telangana'
  and zone in ('Hyderabad', 'Warangal', 'Karimnagar', 'Nizamabad', 'Khammam', 'Mahbubnagar');

delete from public.accident_data
where state = 'Telangana'
  and zone in ('Hyderabad', 'Warangal', 'Karimnagar', 'Nizamabad', 'Khammam', 'Mahbubnagar');

delete from public.water_data
where zone in ('Hyderabad', 'Warangal', 'Karimnagar', 'Nizamabad', 'Khammam', 'Mahbubnagar');

with zone_aqi(zone, aqi_values) as (
  values
    ('Hyderabad', array[78,82,84,90,86,80,84,88,91,87,85,83,86,89]),
    ('Warangal', array[68,70,72,75,74,71,72,73,76,74,72,70,73,75]),
    ('Karimnagar', array[55,57,58,60,59,56,58,59,61,60,58,57,59,60]),
    ('Nizamabad', array[60,61,62,65,63,61,62,64,66,63,62,61,63,64]),
    ('Khammam', array[65,68,70,73,72,69,70,72,74,71,70,69,72,73]),
    ('Mahbubnagar', array[74,76,79,82,80,77,79,81,83,80,78,77,80,82])
),
days(day_index) as (
  select generate_series(1, 14)
)
insert into public.aqi_data (state, zone, date, aqi)
select
  'Telangana',
  zone_aqi.zone,
  (current_date - ((14 - days.day_index) * interval '1 day'))::date,
  zone_aqi.aqi_values[days.day_index]
from zone_aqi
cross join days;

with zone_accidents(zone, accident_values) as (
  values
    ('Hyderabad', array[6,5,7,8,9,6,5,7,8,9,7,6,5,6]),
    ('Warangal', array[4,3,5,5,6,4,3,4,5,6,4,4,3,4]),
    ('Karimnagar', array[2,2,3,3,4,2,2,2,3,4,3,2,2,2]),
    ('Nizamabad', array[3,2,3,4,4,3,2,3,4,4,3,2,2,3]),
    ('Khammam', array[4,4,5,6,6,4,4,5,5,6,5,4,4,4]),
    ('Mahbubnagar', array[5,5,6,7,8,5,5,6,7,8,6,5,5,5])
),
days(day_index) as (
  select generate_series(1, 14)
)
insert into public.accident_data (state, zone, date, accident_count, severity)
select
  'Telangana',
  zone_accidents.zone,
  (current_date - ((14 - days.day_index) * interval '1 day'))::date,
  zone_accidents.accident_values[days.day_index],
  case
    when zone_accidents.accident_values[days.day_index] >= 7 then 'High'
    when zone_accidents.accident_values[days.day_index] >= 4 then 'Medium'
    else 'Low'
  end
from zone_accidents
cross join days;

insert into public.water_data (
  zone,
  ph,
  hardness,
  solids,
  chloramines,
  sulfate,
  conductivity,
  organic_carbon,
  temperature,
  dissolved_oxygen,
  turbidity,
  potability
) values
  ('Hyderabad', 7.2, 185, 18000, 3.2, 310, 420, 11.8, 24.4, 7.6, 3.1, 'Potable'),
  ('Warangal', 7.4, 172, 16500, 3.0, 290, 395, 10.9, 25.2, 7.9, 2.6, 'Potable'),
  ('Karimnagar', 7.1, 166, 14800, 2.8, 275, 372, 10.5, 23.8, 8.2, 2.1, 'Potable'),
  ('Nizamabad', 7.3, 178, 15800, 3.1, 285, 388, 11.2, 24.9, 7.8, 2.8, 'Potable'),
  ('Khammam', 6.8, 212, 24200, 4.8, 365, 545, 17.2, 29.1, 5.2, 5.7, 'Needs Review'),
  ('Mahbubnagar', 6.6, 226, 26800, 5.1, 382, 568, 18.6, 30.4, 4.8, 6.4, 'Needs Review');
