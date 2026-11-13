-- Сид: основатель + демо-состав + новость + инвайт.
-- Идемпотентно: выполняется только если таблица users пуста.
DO $seed$
DECLARE
  founder_id int;
  row_id int;
BEGIN
  IF EXISTS (SELECT 1 FROM users) THEN
    RETURN;
  END IF;

  INSERT INTO users (username, password_hash, display_name, level, role_title, hired_at, level_assigned_at)
  VALUES ('founder', 'scrypt$1fcfc2cc0020ac0f6ed83b4af116552d$97def0212f796e5cb1af2d2cdddf1d45b0f001851061e40e2cad2538881c3452cfc5d2a41919eaedb31ea73a2bcc3022d05b32fcd64ab2cf6d6dd1b9e1c79750', 'Основатель', 7, 'Основатель проекта', now(), now())
  RETURNING id INTO founder_id;

  INSERT INTO staff_terms (user_id, kind, level, role_title, reason)
  VALUES (founder_id, 'hire', 7, 'Основатель проекта', 'Первичная инициализация');

  INSERT INTO users (username, password_hash, display_name, level, role_title)
  VALUES ('deputy', 'scrypt$ee7a152d28905bcbead3c99de4449b2f$163b30a5d375f14af31ea5c4f17dc44721a1cb904f8f07d871514aabda541930b7308a9ac64ef915d1d206e95db253cc1764f86c2c136a6de1303bc4ccd66762', 'З deputy', 6, 'Заместитель основателя')
  RETURNING id INTO row_id;

  INSERT INTO staff_terms (user_id, kind, level, role_title, reason)
  VALUES (row_id, 'hire', 6, 'Заместитель основателя', 'Демо-сотрудник');

  INSERT INTO rating_events (user_id, delta, balance_before, balance_after, reason, actor_id)
  VALUES (row_id, 100, 0, 100, 'Стартовый рейтинг (демо)', founder_id);

  UPDATE users SET rating = 100 WHERE id = row_id;

  INSERT INTO users (username, password_hash, display_name, level, role_title)
  VALUES ('curator', 'scrypt$cf2961080874563f78d1d42cddf0fcee$3c3ea93aee1cc684ea6ef0235021b4ac0e205241244b0f9e90a34aa7f8f57d2c086b1347e4b8b84eb159c3e636922c5e3c42531a2215500ef0c0d47cd219341b', 'Куратор Мей', 4, 'Куратор контента')
  RETURNING id INTO row_id;

  INSERT INTO staff_terms (user_id, kind, level, role_title, reason)
  VALUES (row_id, 'hire', 4, 'Куратор контента', 'Демо-сотрудник');

  INSERT INTO rating_events (user_id, delta, balance_before, balance_after, reason, actor_id)
  VALUES (row_id, 100, 0, 100, 'Стартовый рейтинг (демо)', founder_id);

  UPDATE users SET rating = 100 WHERE id = row_id;

  INSERT INTO users (username, password_hash, display_name, level, role_title)
  VALUES ('senior', 'scrypt$968f9b49c2b18afd927146a5634f0dc7$e282c6c43666e4b71161ac1b109ad69f4bf396818f4eaec69b8194fc34682c3f1c19b3fedd5e13f918f7de046c826486bcf5ad9bd99e04a76718ee0db543711a', 'Старший состав', 3, 'Старший модератор')
  RETURNING id INTO row_id;

  INSERT INTO staff_terms (user_id, kind, level, role_title, reason)
  VALUES (row_id, 'hire', 3, 'Старший модератор', 'Демо-сотрудник');

  INSERT INTO rating_events (user_id, delta, balance_before, balance_after, reason, actor_id)
  VALUES (row_id, 100, 0, 100, 'Стартовый рейтинг (демо)', founder_id);

  UPDATE users SET rating = 100 WHERE id = row_id;

  INSERT INTO users (username, password_hash, display_name, level, role_title)
  VALUES ('member', 'scrypt$72b56f696ce0fc8f98b7f47f7d45e4c3$d4f4fb36b9d9c32d4f25a1b8460f48b863083221a0004dbf6bf4edbc6c89cda3feaef3ad226441e165a9d69b9816e844d4e99698d5e8560453f485ebfdcb8b45', 'Состав', 2, 'Модератор')
  RETURNING id INTO row_id;

  INSERT INTO staff_terms (user_id, kind, level, role_title, reason)
  VALUES (row_id, 'hire', 2, 'Модератор', 'Демо-сотрудник');

  INSERT INTO rating_events (user_id, delta, balance_before, balance_after, reason, actor_id)
  VALUES (row_id, 100, 0, 100, 'Стартовый рейтинг (демо)', founder_id);

  UPDATE users SET rating = 100 WHERE id = row_id;

  INSERT INTO users (username, password_hash, display_name, level, role_title)
  VALUES ('junior', 'scrypt$6cd10a7a0965e5b243cc46f59db546af$8fecc2095bf1a2431df3d2bfd44a3c0f4d23c3a34019ab45ff68a26456e3964f1f9024a280c3cabd82fae783b7063f60bcd5cbf38093a4234884365f33a73fe7', 'Младший состав', 1, 'Хелпер')
  RETURNING id INTO row_id;

  INSERT INTO staff_terms (user_id, kind, level, role_title, reason)
  VALUES (row_id, 'hire', 1, 'Хелпер', 'Демо-сотрудник');

  INSERT INTO rating_events (user_id, delta, balance_before, balance_after, reason, actor_id)
  VALUES (row_id, 100, 0, 100, 'Стартовый рейтинг (демо)', founder_id);

  UPDATE users SET rating = 100 WHERE id = row_id;

  INSERT INTO news (title, body, author_id)
  VALUES (
    'Сайт персонала запущен',
    'Открыт сайт персонала проекта «Слово Меймея»: состав, рейтинг, дисциплина, новости и заявки на вступление. Демо-сотрудники созданы сидом — замени их через панель управления.',
    founder_id
  );

  INSERT INTO invites (code, level, role_title, created_by, expires_at)
  VALUES ('DEMO-INVITE-24', 2, 'Модератор', founder_id, now() + interval '30 days');
END
$seed$;
