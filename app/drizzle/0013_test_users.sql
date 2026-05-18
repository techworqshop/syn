-- Test-User Hardlock: NIE Admin, egal was Migration 0008 macht.
-- 0008 promotet alle @worqshop.io zu Admin — diese Migration ueberschreibt
-- das gezielt fuer Test-Accounts. Laeuft NACH 0008 auf jedem Boot.
UPDATE users
   SET is_admin = false
 WHERE email IN ('lukasz+1@worqshop.io');
