INSERT INTO "users" ("email", "password_hash", "name", "role") VALUES
  ('tiff@windwardfinancial.net',     '$2b$10$2xHdBIxPJDyBQxM8sU77VObIKPY/1j8BKUuBwI3J8k/OaaEWI5qOC', 'Tiff',     'admin'),
  ('may@windwardfinancial.net',      '$2b$10$Elnbuk6MbwDV7ZwOU6dvQuhNj/d/8hePhd.uf2/prMrUt9v/R7NWe', 'May',      'admin'),
  ('brittany@windwardfinancial.net', '$2b$10$a2WYynwUHMQ7duz5uYBsMua6ynRrq19L8ps/2M58aGWHR8ovqfdIq', 'Brittany', 'admin'),
  ('ikaika@windwardfinancial.net',   '$2b$10$ojABGgOnArij75Sz1Jwd3O4UJd.GeGAhPskS/4n2JM3GZQuuKjqxC', 'Ikaika',   'admin')
ON CONFLICT ("email") DO NOTHING;
