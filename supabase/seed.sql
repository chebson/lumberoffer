-- Optional sample data so the app can be tried before real lists are loaded.
-- Prices, lanes and customers here are illustrative only.

insert into lists (key, label, mbf_tridem, mbf_tandem, mbf_superb, sort) values
  ('SPF',  'SPF',         35, 28, 55, 1),
  ('DF',   'Douglas Fir', 30, 24, 50, 2),
  ('MSR',  'MSR',         30, 24, 50, 3),
  ('ECON', '#3 / Econo',  30, 24, 55, 4)
on conflict (key) do nothing;

insert into products (list_key, dim, description, tally, fbm, ship, usd, cad, sort) values
  ('SPF','2x4','#2&Btr SPF KD HT','{"12":8,"14":10,"16":14}',112896,'Prompt',505,692,1),
  ('SPF','2x4','#2&Btr SPF KD HT','{"8":4,"10":6,"12":6,"14":6,"16":8,"18":2}',112896,'Prompt',488,669,2),
  ('SPF','2x6','#2&Btr SPF KD HT','{"16":16,"20":16}',108864,'Prompt',622,852,3),
  ('SPF','2x8','#2&Btr SPF KD HT','{"12":6,"14":8,"16":10}',53760,'Prompt',566,775,4),
  ('SPF','2x10','#2&Btr SPF KD HT','{"10":2,"12":6,"14":4,"16":8}',48300,'Prompt',742,1017,5),
  ('DF','2x4','#2&Btr DF KD HT','{"8":2,"10":2,"12":2,"14":1,"16":3,"18":1,"20":1}',31360,'Prompt',568,778,6),
  ('DF','2x6','#2&Btr DF KD HT','{"10":2,"12":2,"14":2,"16":3,"18":2}',29484,'Prompt',655,897,7),
  ('MSR','2x4','2100 MSR SPF KD HT','{"12":4,"14":6,"16":6}',56448,'Prompt',598,819,8),
  ('ECON','2x4','#3 SPF KD HT','{"10":3,"12":6,"14":8,"16":12,"18":5,"20":4}',112896,'Prompt',382,523,9);

insert into truck_rates (city, st, equipment, carrier, rate, currency) values
  ('Calgary','AB','Super B','Sample Carrier A',3450,'CAD'),
  ('Edmonton','AB','Super B','Sample Carrier A',3650,'CAD'),
  ('Spokane','WA','Tridem/Maxi','Sample Carrier C',1650,'USD'),
  ('Boise','ID','Tridem/Maxi','Sample Carrier C',2650,'USD'),
  ('Salt Lake City','UT','Tridem/Maxi','Sample Carrier D',3600,'USD'),
  ('Minneapolis','MN','Tandem','Sample Carrier D',4900,'USD');

insert into rail_rates (city, st, carrier, rate_mbf, currency) values
  ('Denver','CO','BNSF',152,'USD'),
  ('Fargo','ND','BNSF',128,'USD'),
  ('Winnipeg','MB','CN',118,'CAD');

with c as (
  insert into customers (name, contact, email, currency, lists)
  values ('Sample Building Supply','Sam Buyer','buyer@example.com','USD','{SPF,DF}')
  returning id
)
insert into yards (customer_id, city, st, mode, equipment, sort)
select id, 'Salt Lake City', 'UT', 'truck', 'Tridem/Maxi', 0 from c
union all
select id, 'Boise', 'ID', 'truck', 'Tridem/Maxi', 1 from c;
