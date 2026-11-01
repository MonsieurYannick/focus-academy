# FOCUS Academy

Plateforme pédagogique React/TypeScript conçue pour la photographie, la vidéo et la post-production. Le dépôt contient le frontend, le modèle PostgreSQL versionné, les règles d’accès Supabase et les fondations des parcours de cours, progression, devoirs, sessions et certificats.

## Déploiement Netlify

Le projet est une application statique Vite. Aucun backend n’est requis pour utiliser le studio.

1. Connectez le dépôt à Netlify.
2. Commande de build : `npm run build`
3. Dossier de publication : `dist`
4. Aucune variable d’environnement n’est nécessaire pour le studio.
5. Pour activer Supabase plus tard, ajoutez `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` dans les variables Netlify, puis appliquez la migration.

Le fichier `netlify.toml` et `public/_redirects` gèrent le routage SPA.

## Lancer le frontend

Prérequis : Node.js 20.19+ (ou 22.12+) et npm.

```sh
npm install
npm run dev
```

Ouvrez l’adresse locale affichée par Vite. Sans configuration Supabase, les pages publiques et le simulateur restent utilisables ; les comptes, le catalogue réel, la progression, les remises et les documents indiquent qu’ils ne sont pas configurés. Aucune progression n’est enregistrée dans le stockage local du navigateur.

## Vérifications locales

```sh
npm run typecheck
npm test
npm run build
```

## Préparer Supabase

1. Créez un projet Supabase dans votre compte et choisissez la région adaptée à vos apprenants. Le dépôt n’est associé à aucun projet distant.
2. Copiez `.env.example` vers `.env.local` et renseignez `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` depuis les paramètres API du projet.
3. N’ajoutez jamais une clé `service_role` ou une clé secrète à une variable `VITE_`.
4. Appliquez `supabase/migrations/20261027000100_initial_platform.sql` sur un projet de développement/test. Les migrations ne sont pas exécutées depuis le frontend.
5. Vérifiez le flux d’inscription par e-mail et les URLs de redirection Auth dans le tableau de bord Supabase.
6. Avec Supabase CLI et une base locale démarrée, générez les types à partir du schéma appliqué (`supabase gen types typescript --local > src/lib/database.types.ts`), puis remplacez le type client provisoire dans `src/lib/supabase.ts` par ces types générés.
7. Créez le premier profil administrateur depuis un environnement d’administration de confiance après inscription :

```sql
-- Remplacez l’adresse par celle du compte que vous venez de créer.
update public.profiles p
set role = 'admin'
from auth.users u
where p.id = u.id
  and u.email = 'admin@example.invalid';
```

La commande est un exemple à adapter et à exécuter manuellement dans le SQL Editor de votre projet de test. Aucun administrateur par défaut ni mot de passe codé en dur n’est créé.

Les comptes suivants s’inscrivent avec le rôle étudiant par défaut. Après avoir créé l’administrateur, un opérateur autorisé peut attribuer d’autres rôles et associations dans le SQL Editor. Adaptez ces exemples aux comptes et IDs existants :

```sql
-- Promouvoir un compte existant en formateur.
update public.profiles p
set role = 'instructor'
from auth.users u
where p.id = u.id
  and u.email = 'formateur@example.invalid';

-- Associer un compte parent à un profil étudiant déjà créé.
insert into public.guardian_student_links (guardian_id, student_id, linked_by)
select parent_profile.id, student_profile.id, admin_profile.id
from auth.users parent_user
join public.profiles parent_profile on parent_profile.id = parent_user.id and parent_profile.role = 'guardian'
join auth.users student_user on student_user.email = 'etudiant@example.invalid'
join public.profiles student_profile on student_profile.id = student_user.id and student_profile.role = 'student'
join auth.users admin_user on admin_user.email = 'admin@example.invalid'
join public.profiles admin_profile on admin_profile.id = admin_user.id and admin_profile.role = 'admin'
where parent_user.email = 'parent@example.invalid';

-- Affecter un formateur à une formation.
insert into public.course_instructors (course_id, instructor_id, assigned_by)
select c.id, instructor.id, admin_profile.id
from public.courses c
join auth.users instructor_user on instructor_user.email = 'formateur@example.invalid'
join public.profiles instructor on instructor.id = instructor_user.id and instructor.role = 'instructor'
join auth.users admin_user on admin_user.email = 'admin@example.invalid'
join public.profiles admin_profile on admin_profile.id = admin_user.id and admin_profile.role = 'admin'
where c.slug = 'slug-de-la-formation';
```

Ces opérations ne sont pas exposées comme auto-attribution de rôle dans le navigateur. Vérifiez le nombre de lignes affectées avant de poursuivre.

## Architecture

- `src/ui/` : routes, pages et interface responsive.
- `src/state/auth.tsx` : session Supabase Auth et chargement du profil.
- `src/lib/photography.ts` : calculs pédagogiques du simulateur.
- `src/lib/storage.ts` : validation côté interface et dépôt dans le bucket privé `student-work`.
- `supabase/migrations/` : schéma versionné, fonctions RPC et politiques RLS.
- `supabase/config.toml` : valeurs de développement local de Supabase CLI.

Les données pédagogiques ne sont pas inventées ou préchargées : les formations doivent être ajoutées par l’équipe et publiées. Les rôles et les accès sont revérifiés par PostgreSQL/RLS ; l’interface seule n’est pas une frontière de sécurité.

## État des intégrations

- **Auth, base, stockage et sessions :** code prêt à raccorder, mais aucun projet Supabase distant n’est configuré ou connecté dans ce dépôt.
- **Ressources vidéo :** les URL HTTP(S) autorisées s’ouvrent chez leur fournisseur. FOCUS ne télécharge ni ne réhéberge de contenus tiers.
- **Sessions en direct :** la plateforme stocke date, formateur et lien facultatif ; aucune visioconférence n’est intégrée.
- **Rapports :** le rapport à l’écran utilise les données autorisées et peut être imprimé/enregistré en PDF depuis le navigateur. Aucun document n’est généré côté serveur.
- **Certificats :** la migration prévoit une délivrance contrôlée, une révocation et une vérification RPC. Ces fonctions deviennent opérationnelles après application de la migration et tests sur Supabase.

## Limites connues

La migration n’a pas été appliquée ni validée sur un serveur PostgreSQL dans cet environnement : le CLI Supabase et un compte externe ne sont pas configurés. Les autorisations doivent être éprouvées avec des comptes de test distincts (admin, formateur, étudiant, tuteur) avant toute donnée réelle. Le stockage vidéo volumineux dépend aussi des quotas et limites du forfait Supabase choisi.
