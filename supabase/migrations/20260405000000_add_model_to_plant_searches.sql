ALTER TABLE plant_searches ADD COLUMN model text;

UPDATE plant_searches SET model = 'claude' WHERE model IS NULL;
