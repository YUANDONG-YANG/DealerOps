SET NAMES utf8mb4;

-- DealerOps demo seed 07: self-service join requests (AUTH-16..23).
-- Applicants are unbound Dealer.User accounts that asked to join one of the 30 seed dealerships
-- through Google sign-in, plus the JOIN_REQUEST inbox notification each request posted.
-- Rows mirror the code paths exactly:
--   * Google-only sign-up (AuthService.CreateUnboundGoogleUser): password_hash '', phone NULL,
--     username from the e-mail local part, Google claims stored (sub, names, picture, locale).
--   * Password registration later linked with Google (AuthService.Register + SetRequestedDealer):
--     BCrypt hash and phone kept, Google claims synced on the later sign-in.
--   * Payload JSON matches NotificationService.Create (System.Text.Json, camelCase).
--   * APPROVED  (JoinRequestService.Approve): dealer_id set, requested_dealer_id cleared, active
--     membership with created_by = the approving staff member.
--   * REJECTED  (JoinRequestService.Reject): requested_dealer_id cleared, still unbound.
--   * CANCELLED (MeController.DeleteMe): account deactivated, email/phone suffixed with
--     ':deleted:<id>', resolved_by = the applicant.
--   * Unresolved rows stay pending: requested_dealer_id set, dealer_id NULL.
-- Dealers are resolved by contact_email; every insert is guarded so a re-run adds nothing.

DROP TEMPORARY TABLE IF EXISTS seed_join_request;
CREATE TEMPORARY TABLE seed_join_request (
  username        VARCHAR(64)  NOT NULL PRIMARY KEY,
  display_name    VARCHAR(120) NOT NULL,
  given_name      VARCHAR(120) NOT NULL,
  family_name     VARCHAR(120) NOT NULL,
  email           VARCHAR(254) NOT NULL,
  phone           VARCHAR(40)  NULL,
  password_hash   VARCHAR(100) NOT NULL,
  google_sub      VARCHAR(64)  NOT NULL,
  avatar_url      TEXT         NOT NULL,
  locale          VARCHAR(16)  NOT NULL,
  dealer_email    VARCHAR(120) NOT NULL,
  outcome         VARCHAR(16)  NOT NULL,
  user_created_at DATETIME     NOT NULL,
  requested_at    DATETIME(6)  NOT NULL,
  resolved_at     DATETIME(6)  NULL,
  resolved_by     VARCHAR(64)  NULL,
  payload         TEXT         NOT NULL
);

INSERT INTO seed_join_request
  (username, display_name, given_name, family_name, email, phone, password_hash, google_sub,
   avatar_url, locale, dealer_email, outcome, user_created_at, requested_at, resolved_at,
   resolved_by, payload)
VALUES
  ('ethan.lindqvist', 'Ethan Lindqvist', 'Ethan', 'Lindqvist', 'ethan.lindqvist@gmail.com', NULL, '', '152601815908301661318',
   'https://randomuser.me/api/portraits/men/12.jpg', 'en', 'sales@lakeshoreautosales.ca', 'PENDING', '2026-09-22 09:52:46', '2026-09-22 09:52:46.362000', NULL,
   NULL, '{"username":"ethan.lindqvist","displayName":"Ethan Lindqvist","email":"ethan.lindqvist@gmail.com"}'),
  ('smarchetti', 'Sofia Marchetti', 'Sofia', 'Marchetti', 'sofia.marchetti91@gmail.com', '+16475550112', '$2a$10$3HJsO33X6V2tItq6H05zG.JPypocvryhII3YPyYNHU1mOKrUJY0z.', '190996030824628194821',
   'https://randomuser.me/api/portraits/women/13.jpg', 'en-CA', 'sales@lakeshoreautosales.ca', 'APPROVED', '2026-09-23 08:53:25', '2026-09-26 17:53:25.070000', '2026-09-27 21:24:25.070000',
   'emma.patel', '{"username":"smarchetti","displayName":"Sofia Marchetti","email":"sofia.marchetti91@gmail.com"}'),
  ('kofi.asante.to', 'Kofi Asante', 'Kofi', 'Asante', 'kofi.asante.to@gmail.com', NULL, '', '157975432319487574911',
   'https://randomuser.me/api/portraits/men/15.jpg', 'en-US', 'sales@northgatemotors.ca', 'PENDING', '2026-10-09 12:11:39', '2026-10-09 12:11:39.117000', NULL,
   NULL, '{"username":"kofi.asante.to","displayName":"Kofi Asante","email":"kofi.asante.to@gmail.com"}'),
  ('lbernstein', 'Leah Bernstein', 'Leah', 'Bernstein', 'leahbernstein@outlook.com', '+12895550127', '$2a$10$3HJsO33X6V2tItq6H05zG.JPypocvryhII3YPyYNHU1mOKrUJY0z.', '176018955597971147104',
   'https://randomuser.me/api/portraits/women/16.jpg', 'en-US', 'sales@northgatemotors.ca', 'REJECTED', '2026-09-18 11:14:36', '2026-09-30 11:14:36.276000', '2026-10-02 09:24:36.276000',
   'jasmine.martin', '{"username":"lbernstein","displayName":"Leah Bernstein","email":"leahbernstein@outlook.com"}'),
  ('arash.karimi', 'Arash Karimi', 'Arash', 'Karimi', 'arash.karimi@gmail.com', NULL, '', '170342366712768426846',
   'https://randomuser.me/api/portraits/men/17.jpg', 'en-US', 'sales@mapleleafpreowned.ca', 'APPROVED', '2026-10-02 18:50:55', '2026-10-02 18:50:55.130000', '2026-10-03 15:04:55.130000',
   'mateo.baker', '{"username":"arash.karimi","displayName":"Arash Karimi","email":"arash.karimi@gmail.com"}'),
  ('nadia.petrovic', 'Nadia Petrovic', 'Nadia', 'Petrovic', 'nadia.petrovic@gmail.com', NULL, '', '107924402685995289078',
   'https://randomuser.me/api/portraits/women/18.jpg', 'en-US', 'sales@mapleleafpreowned.ca', 'PENDING', '2026-09-29 12:34:54', '2026-09-29 12:34:54.286000', NULL,
   NULL, '{"username":"nadia.petrovic","displayName":"Nadia Petrovic","email":"nadia.petrovic@gmail.com"}'),
  ('jordan_whitfield', 'Jordan Whitfield', 'Jordan', 'Whitfield', 'jwhitfield88@hotmail.com', '+12895550143', '$2a$10$3HJsO33X6V2tItq6H05zG.JPypocvryhII3YPyYNHU1mOKrUJY0z.', '160313721590109281590',
   'https://randomuser.me/api/portraits/men/18.jpg', 'en-CA', 'sales@trilliumcarcentre.ca', 'PENDING', '2026-09-11 03:35:51', '2026-09-20 08:35:51.348000', NULL,
   NULL, '{"username":"jordan_whitfield","displayName":"Jordan Whitfield","email":"jwhitfield88@hotmail.com"}'),
  ('amara.nwosu', 'Amara Nwosu', 'Amara', 'Nwosu', 'amara.nwosu@gmail.com', NULL, '', '157117777412154728038',
   'https://randomuser.me/api/portraits/women/20.jpg', 'en-CA', 'sales@huronvalleyauto.ca', 'PENDING', '2026-09-23 08:01:59', '2026-09-23 08:01:59.310000', NULL,
   NULL, '{"username":"amara.nwosu","displayName":"Amara Nwosu","email":"amara.nwosu@gmail.com"}'),
  ('caleb_fontaine', 'Caleb Fontaine', 'Caleb', 'Fontaine', 'caleb.fontaine@yahoo.ca', '+13435550158', '$2a$10$3HJsO33X6V2tItq6H05zG.JPypocvryhII3YPyYNHU1mOKrUJY0z.', '141485253888539336338',
   'https://randomuser.me/api/portraits/men/20.jpg', 'fr-CA', 'sales@huronvalleyauto.ca', 'APPROVED', '2026-09-25 22:13:59', '2026-09-27 10:13:59.183000', '2026-09-29 23:29:59.183000',
   'gurpreet.roy', '{"username":"caleb_fontaine","displayName":"Caleb Fontaine","email":"caleb.fontaine@yahoo.ca"}'),
  ('yuki.hayashi.ca', 'Yuki Hayashi', 'Yuki', 'Hayashi', 'yuki.hayashi.ca@gmail.com', NULL, '', '195755131373537990751',
   'https://randomuser.me/api/portraits/women/23.jpg', 'en', 'sales@carlingavenuemotors.ca', 'PENDING', '2026-09-29 23:09:15', '2026-09-29 23:09:15.142000', NULL,
   NULL, '{"username":"yuki.hayashi.ca","displayName":"Yuki Hayashi","email":"yuki.hayashi.ca@gmail.com"}'),
  ('m.siddiqui77', 'Mohammed Siddiqui', 'Mohammed', 'Siddiqui', 'm.siddiqui77@gmail.com', NULL, '', '172651676122202972997',
   'https://randomuser.me/api/portraits/men/23.jpg', 'en-CA', 'sales@riversideautogroup.ca', 'REJECTED', '2026-10-05 23:24:25', '2026-10-05 23:24:25.107000', '2026-10-06 02:24:25.107000',
   'ryan.cohen', '{"username":"m.siddiqui77","displayName":"Mohammed Siddiqui","email":"m.siddiqui77@gmail.com"}'),
  ('tmcallister', 'Tessa McAllister', 'Tessa', 'McAllister', 'tessa.mcallister@outlook.com', '+12265550119', '$2a$10$3HJsO33X6V2tItq6H05zG.JPypocvryhII3YPyYNHU1mOKrUJY0z.', '182633043483954862057',
   'https://randomuser.me/api/portraits/women/26.jpg', 'en-US', 'sales@riversideautogroup.ca', 'PENDING', '2026-09-19 19:51:26', '2026-09-25 03:51:26.301000', NULL,
   NULL, '{"username":"tmcallister","displayName":"Tessa McAllister","email":"tessa.mcallister@outlook.com"}'),
  ('diego.alvarez.on', 'Diego Alvarez', 'Diego', 'Alvarez', 'diego.alvarez.on@gmail.com', NULL, '', '107290222791805888718',
   'https://randomuser.me/api/portraits/men/24.jpg', 'en-CA', 'sales@baystreetautos.ca', 'APPROVED', '2026-10-04 11:42:58', '2026-10-04 11:42:58.090000', '2026-10-07 05:10:58.090000',
   'emma.wang', '{"username":"diego.alvarez.on","displayName":"Diego Alvarez","email":"diego.alvarez.on@gmail.com"}'),
  ('ingrid.solberg', 'Ingrid Solberg', 'Ingrid', 'Solberg', 'ingrid.solberg@gmail.com', NULL, '', '117598983478878384837',
   'https://randomuser.me/api/portraits/women/27.jpg', 'en-US', 'sales@kingswaycarcompany.ca', 'PENDING', '2026-10-11 08:34:32', '2026-10-11 08:34:32.201000', NULL,
   NULL, '{"username":"ingrid.solberg","displayName":"Ingrid Solberg","email":"ingrid.solberg@gmail.com"}'),
  ('raj_malhotra', 'Raj Malhotra', 'Raj', 'Malhotra', 'rajmalhotra.cars@gmail.com', '+12495550131', '$2a$10$3HJsO33X6V2tItq6H05zG.JPypocvryhII3YPyYNHU1mOKrUJY0z.', '113613412524273167232',
   'https://randomuser.me/api/portraits/men/27.jpg', 'en-US', 'sales@kingswaycarcompany.ca', 'CANCELLED', '2026-09-06 12:34:39', '2026-09-20 15:34:39.222000', '2026-09-22 16:34:39.222000',
   'raj_malhotra', '{"username":"raj_malhotra","displayName":"Raj Malhotra","email":"rajmalhotra.cars@gmail.com"}'),
  ('camille.dufresne', 'Camille Dufresne', 'Camille', 'Dufresne', 'camille.dufresne@gmail.com', NULL, '', '150587706589481131144',
   'https://randomuser.me/api/portraits/women/28.jpg', 'fr-CA', 'sales@limestonecitymotors.ca', 'PENDING', '2026-10-08 19:42:12', '2026-10-08 19:42:12.106000', NULL,
   NULL, '{"username":"camille.dufresne","displayName":"Camille Dufresne","email":"camille.dufresne@gmail.com"}'),
  ('brendan_kowalczyk', 'Brendan Kowalczyk', 'Brendan', 'Kowalczyk', 'brendan.kowalczyk@outlook.com', '+12895550164', '$2a$10$3HJsO33X6V2tItq6H05zG.JPypocvryhII3YPyYNHU1mOKrUJY0z.', '164628897514026140141',
   'https://randomuser.me/api/portraits/men/30.jpg', 'en-CA', 'sales@limestonecitymotors.ca', 'APPROVED', '2026-10-05 11:43:05', '2026-10-09 18:43:05.045000', '2026-10-11 15:18:05.045000',
   'arjun.rahman', '{"username":"brendan_kowalczyk","displayName":"Brendan Kowalczyk","email":"brendan.kowalczyk@outlook.com"}'),
  ('hana.yoshida', 'Hana Yoshida', 'Hana', 'Yoshida', 'hana.yoshida@gmail.com', NULL, '', '149208312402344834782',
   'https://randomuser.me/api/portraits/women/30.jpg', 'en-CA', 'sales@goldenhorseshoeauto.ca', 'PENDING', '2026-10-15 18:43:58', '2026-10-15 18:43:58.047000', NULL,
   NULL, '{"username":"hana.yoshida","displayName":"Hana Yoshida","email":"hana.yoshida@gmail.com"}'),
  ('tariq.mansour', 'Tariq Mansour', 'Tariq', 'Mansour', 'tariq.mansour@gmail.com', NULL, '', '108838737167868433532',
   'https://randomuser.me/api/portraits/men/32.jpg', 'en-CA', 'sales@royaloakautosales.ca', 'PENDING', '2026-10-14 05:06:52', '2026-10-14 05:06:52.047000', NULL,
   NULL, '{"username":"tariq.mansour","displayName":"Tariq Mansour","email":"tariq.mansour@gmail.com"}'),
  ('mcallaghan', 'Maeve Callaghan', 'Maeve', 'Callaghan', 'maeve.callaghan@icloud.com', '+13435550176', '$2a$10$3HJsO33X6V2tItq6H05zG.JPypocvryhII3YPyYNHU1mOKrUJY0z.', '114620168493407224704',
   'https://randomuser.me/api/portraits/women/32.jpg', 'en-CA', 'sales@royaloakautosales.ca', 'REJECTED', '2026-09-17 02:39:45', '2026-09-19 06:39:45.151000', '2026-09-21 04:50:45.151000',
   'olivia.novak', '{"username":"mcallaghan","displayName":"Maeve Callaghan","email":"maeve.callaghan@icloud.com"}'),
  ('andre.baptiste', 'Andre Baptiste', 'Andre', 'Baptiste', 'andre.baptiste@gmail.com', NULL, '', '156174833801412690604',
   'https://randomuser.me/api/portraits/men/34.jpg', 'en-CA', 'sales@escarpmentmotors.ca', 'APPROVED', '2026-10-09 00:22:27', '2026-10-09 00:22:27.119000', '2026-10-11 03:10:27.119000',
   'lucas.smith', '{"username":"andre.baptiste","displayName":"Andre Baptiste","email":"andre.baptiste@gmail.com"}'),
  ('evasquez', 'Elena Vasquez', 'Elena', 'Vasquez', 'elena.vasquez.ca@gmail.com', '+16475550185', '$2a$10$3HJsO33X6V2tItq6H05zG.JPypocvryhII3YPyYNHU1mOKrUJY0z.', '172492086828890931002',
   'https://randomuser.me/api/portraits/women/35.jpg', 'en-CA', 'sales@pinecrestautosales.ca', 'PENDING', '2026-09-26 17:35:07', '2026-10-12 01:35:07.065000', NULL,
   NULL, '{"username":"evasquez","displayName":"Elena Vasquez","email":"elena.vasquez.ca@gmail.com"}'),
  ('samuel.okafor', 'Samuel Okafor', 'Samuel', 'Okafor', 'samuel.okafor@gmail.com', NULL, '', '108374071881817414333',
   'https://randomuser.me/api/portraits/men/37.jpg', 'en-US', 'sales@thamesvalleymotors.ca', 'PENDING', '2026-09-25 11:05:36', '2026-09-25 11:05:36.079000', NULL,
   NULL, '{"username":"samuel.okafor","displayName":"Samuel Okafor","email":"samuel.okafor@gmail.com"}'),
  ('lpelletier', 'Lauren Pelletier', 'Lauren', 'Pelletier', 'lauren.pelletier@outlook.com', '+14375550108', '$2a$10$3HJsO33X6V2tItq6H05zG.JPypocvryhII3YPyYNHU1mOKrUJY0z.', '174093192544992070741',
   'https://randomuser.me/api/portraits/women/38.jpg', 'fr-CA', 'sales@grandriverauto.ca', 'PENDING', '2026-09-26 19:16:29', '2026-10-07 06:16:29.304000', NULL,
   NULL, '{"username":"lpelletier","displayName":"Lauren Pelletier","email":"lauren.pelletier@outlook.com"}'),
  ('nikhil.bhatt', 'Nikhil Bhatt', 'Nikhil', 'Bhatt', 'nikhil.bhatt@gmail.com', NULL, '', '147771834170471874633',
   'https://randomuser.me/api/portraits/men/38.jpg', 'en', 'sales@ambassadorautosales.ca', 'APPROVED', '2026-10-06 13:12:27', '2026-10-06 13:12:27.174000', '2026-10-08 12:20:27.174000',
   'patrick.morrison', '{"username":"nikhil.bhatt","displayName":"Nikhil Bhatt","email":"nikhil.bhatt@gmail.com"}'),
  ('ava.lindgren', 'Ava Lindgren', 'Ava', 'Lindgren', 'ava.lindgren@gmail.com', NULL, '', '115377602077642656515',
   'https://randomuser.me/api/portraits/women/39.jpg', 'en-CA', 'sales@simcoecountymotors.ca', 'PENDING', '2026-10-02 02:06:35', '2026-10-02 02:06:35.101000', NULL,
   NULL, '{"username":"ava.lindgren","displayName":"Ava Lindgren","email":"ava.lindgren@gmail.com"}'),
  ('marco_ferraro', 'Marco Ferraro', 'Marco', 'Ferraro', 'marco.ferraro@hotmail.com', '+12895550192', '$2a$10$3HJsO33X6V2tItq6H05zG.JPypocvryhII3YPyYNHU1mOKrUJY0z.', '130445166915640410423',
   'https://randomuser.me/api/portraits/men/40.jpg', 'en-US', 'sales@lakeviewpreowned.ca', 'PENDING', '2026-09-12 05:39:48', '2026-09-24 17:39:48.259000', NULL,
   NULL, '{"username":"marco_ferraro","displayName":"Marco Ferraro","email":"marco.ferraro@hotmail.com"}'),
  ('zainab.hussain', 'Zainab Hussain', 'Zainab', 'Hussain', 'zainab.hussain@gmail.com', NULL, '', '106883106792470822765',
   'https://randomuser.me/api/portraits/women/41.jpg', 'en-CA', 'sales@canalstreetauto.ca', 'CANCELLED', '2026-10-01 17:12:13', '2026-10-01 17:12:13.374000', '2026-10-03 23:12:13.374000',
   'zainab.hussain', '{"username":"zainab.hussain","displayName":"Zainab Hussain","email":"zainab.hussain@gmail.com"}'),
  ('gabriel.lacroix', 'Gabriel Lacroix', 'Gabriel', 'Lacroix', 'gabriel.lacroix@gmail.com', NULL, '', '134786122138783757628',
   'https://randomuser.me/api/portraits/men/41.jpg', 'fr-CA', 'sales@northernlightsmotors.ca', 'PENDING', '2026-10-06 03:54:49', '2026-10-06 03:54:49.215000', NULL,
   NULL, '{"username":"gabriel.lacroix","displayName":"Gabriel Lacroix","email":"gabriel.lacroix@gmail.com"}'),
  ('cbisson', 'Chantal Bisson', 'Chantal', 'Bisson', 'chantal.bisson@videotron.ca', '+13435550124', '$2a$10$3HJsO33X6V2tItq6H05zG.JPypocvryhII3YPyYNHU1mOKrUJY0z.', '181535493066683645074',
   'https://randomuser.me/api/portraits/women/44.jpg', 'fr-CA', 'sales@rideauautocentre.ca', 'APPROVED', '2026-09-09 22:51:17', '2026-09-27 06:51:17.362000', '2026-09-28 10:56:17.362000',
   'fatima.kim', '{"username":"cbisson","displayName":"Chantal Bisson","email":"chantal.bisson@videotron.ca"}'),
  ('owen.thibault', 'Owen Thibault', 'Owen', 'Thibault', 'owen.thibault@gmail.com', NULL, '', '136676402067970168773',
   'https://randomuser.me/api/portraits/men/42.jpg', 'fr-CA', 'sales@crossroadscarsales.ca', 'PENDING', '2026-10-06 23:50:51', '2026-10-06 23:50:51.307000', NULL,
   NULL, '{"username":"owen.thibault","displayName":"Owen Thibault","email":"owen.thibault@gmail.com"}'),
  ('rdesai', 'Riya Desai', 'Riya', 'Desai', 'riya.desai@gmail.com', '+12495550147', '$2a$10$3HJsO33X6V2tItq6H05zG.JPypocvryhII3YPyYNHU1mOKrUJY0z.', '117180023904248611148',
   'https://randomuser.me/api/portraits/women/47.jpg', 'en-CA', 'sales@eastgateautomart.ca', 'PENDING', '2026-09-09 23:43:46', '2026-09-29 23:43:46.045000', NULL,
   NULL, '{"username":"rdesai","displayName":"Riya Desai","email":"riya.desai@gmail.com"}'),
  ('felix.brandt', 'Felix Brandt', 'Felix', 'Brandt', 'felix.brandt@outlook.com', NULL, '', '184745378383064003761',
   'https://randomuser.me/api/portraits/men/44.jpg', 'en-CA', 'sales@westsidemotorco.ca', 'REJECTED', '2026-09-24 12:00:37', '2026-09-24 12:00:37.156000', '2026-09-27 04:02:37.156000',
   'jasmine.tran', '{"username":"felix.brandt","displayName":"Felix Brandt","email":"felix.brandt@outlook.com"}'),
  ('keisha.campbell', 'Keisha Campbell', 'Keisha', 'Campbell', 'keisha.campbell@gmail.com', NULL, '', '165630481373433734419',
   'https://randomuser.me/api/portraits/women/49.jpg', 'en-CA', 'sales@highlandautosales.ca', 'PENDING', '2026-10-07 00:28:34', '2026-10-07 00:28:34.380000', NULL,
   NULL, '{"username":"keisha.campbell","displayName":"Keisha Campbell","email":"keisha.campbell@gmail.com"}'),
  ('viktor_horvath', 'Viktor Horvath', 'Viktor', 'Horvath', 'viktor.horvath@gmail.com', '+13435550161', '$2a$10$3HJsO33X6V2tItq6H05zG.JPypocvryhII3YPyYNHU1mOKrUJY0z.', '109260309260026751125',
   'https://randomuser.me/api/portraits/men/45.jpg', 'en-CA', 'sales@brockstreetmotors.ca', 'APPROVED', '2026-09-18 01:12:31', '2026-09-20 05:12:31.380000', '2026-09-22 07:05:31.380000',
   'owen.roy', '{"username":"viktor_horvath","displayName":"Viktor Horvath","email":"viktor.horvath@gmail.com"}'),
  ('naomi.abernathy', 'Naomi Abernathy', 'Naomi', 'Abernathy', 'naomi.abernathy@gmail.com', NULL, '', '157210141561836546107',
   'https://randomuser.me/api/portraits/women/50.jpg', 'en-CA', 'sales@heritageautosales.ca', 'PENDING', '2026-09-23 10:01:32', '2026-09-23 10:01:32.138000', NULL,
   NULL, '{"username":"naomi.abernathy","displayName":"Naomi Abernathy","email":"naomi.abernathy@gmail.com"}'),
  ('devon_mackenzie', 'Devon Mackenzie', 'Devon', 'Mackenzie', 'devon.mackenzie@gmail.com', '+14375550153', '$2a$10$3HJsO33X6V2tItq6H05zG.JPypocvryhII3YPyYNHU1mOKrUJY0z.', '155706360607104319554',
   'https://randomuser.me/api/portraits/men/47.jpg', 'en', 'sales@summitautogroup.ca', 'APPROVED', '2026-09-20 06:12:15', '2026-10-01 10:12:15.192000', '2026-10-01 11:58:15.192000',
   'simran.tran', '{"username":"devon_mackenzie","displayName":"Devon Mackenzie","email":"devon.mackenzie@gmail.com"}'),
  ('lucia.romano', 'Lucia Romano', 'Lucia', 'Romano', 'lucia.romano@gmail.com', NULL, '', '103177646727204293557',
   'https://randomuser.me/api/portraits/women/52.jpg', 'en', 'sales@parkwaymotors.ca', 'PENDING', '2026-09-24 16:47:35', '2026-09-24 16:47:35.121000', NULL,
   NULL, '{"username":"lucia.romano","displayName":"Lucia Romano","email":"lucia.romano@gmail.com"}'),
  ('theo.gallagher', 'Theo Gallagher', 'Theo', 'Gallagher', 'theo.gallagher@outlook.com', NULL, '', '136107885261149131677',
   'https://randomuser.me/api/portraits/men/48.jpg', 'en-CA', 'sales@parkwaymotors.ca', 'PENDING', '2026-10-10 20:33:31', '2026-10-10 20:33:31.357000', NULL,
   NULL, '{"username":"theo.gallagher","displayName":"Theo Gallagher","email":"theo.gallagher@outlook.com"}');

-- Applicant accounts in their final state.
INSERT INTO app_user
  (username, password_hash, display_name, role, dealer_id, requested_dealer_id, active, created_at,
   email, phone, google_sub, given_name, family_name, avatar_url, locale)
SELECT s.username, s.password_hash, s.display_name, 'Dealer.User',
       CASE WHEN s.outcome = 'APPROVED' THEN d.id END,
       CASE WHEN s.outcome = 'PENDING' THEN d.id END,
       CASE WHEN s.outcome = 'CANCELLED' THEN 0 ELSE 1 END,
       s.user_created_at, s.email, s.phone, s.google_sub, s.given_name, s.family_name,
       s.avatar_url, s.locale
FROM seed_join_request s
JOIN dealer d ON d.contact_email = s.dealer_email
WHERE NOT EXISTS (SELECT 1 FROM app_user u WHERE u.username = s.username)
ORDER BY s.user_created_at;

-- Cancelled accounts free their e-mail and phone the way DeleteMe does.
UPDATE app_user u
JOIN seed_join_request s ON s.username = u.username AND s.outcome = 'CANCELLED'
SET u.email = CONCAT(u.email, ':deleted:', u.id),
    u.phone = CASE WHEN u.phone IS NULL THEN NULL ELSE CONCAT(u.phone, ':deleted:', u.id) END
WHERE u.email = s.email;

-- One JOIN_REQUEST per request, resolved or still in the dealership inbox.
INSERT INTO notification (dealer_id, kind, payload, created_at, resolved_at, resolved_by, resolved_action)
SELECT d.id, 'JOIN_REQUEST', s.payload, s.requested_at, s.resolved_at, s.resolved_by,
       CASE WHEN s.outcome = 'PENDING' THEN NULL ELSE s.outcome END
FROM seed_join_request s
JOIN dealer d ON d.contact_email = s.dealer_email
WHERE NOT EXISTS (
  SELECT 1 FROM notification n
  WHERE n.dealer_id = d.id AND n.kind = 'JOIN_REQUEST' AND n.payload = s.payload)
ORDER BY s.requested_at;

-- Approved applicants get the membership JoinRequestService.Approve creates.
INSERT INTO membership (dealer_id, username, active, created_by, created_at)
SELECT d.id, s.username, 1, s.resolved_by, s.resolved_at
FROM seed_join_request s
JOIN dealer d ON d.contact_email = s.dealer_email
WHERE s.outcome = 'APPROVED'
  AND NOT EXISTS (SELECT 1 FROM membership m WHERE m.dealer_id = d.id AND m.username = s.username);

DROP TEMPORARY TABLE seed_join_request;
