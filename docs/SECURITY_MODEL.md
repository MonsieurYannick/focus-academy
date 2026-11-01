# Modèle d’accès — FOCUS Academy

## Principes

- Le navigateur reçoit uniquement l’URL Supabase et la clé publique `anon`/publishable.
- Les rôles sont stockés dans `profiles.role`, initialisés à `student` par trigger. Les métadonnées modifiables de l’utilisateur ne déterminent jamais les autorisations.
- La modification du rôle et la liaison tuteur–étudiant sont réservées à une action d’administration de confiance.
- Les tables exposées ont RLS activée. Les opérations de fin de leçon, correction de quiz, délivrance/révocation et vérification de certificats passent par des fonctions SQL ciblées.
- Les buckets `student-work` et `course-resources` sont privés. Les fichiers étudiant sont rangés sous `<student_uuid>/<exercise_uuid>/...` et téléchargés par URL signée à durée courte.
- La validation MIME/taille dans le navigateur améliore l’expérience, mais la base et Storage revérifient les contraintes. Le frontend n’est pas une frontière de sécurité.

## Règles fonctionnelles représentées dans la migration

| Donnée | Étudiant | Parent/tuteur | Formateur affecté | Administrateur |
|---|---|---|---|---|
| Profil | Son propre profil | Profils explicitement associés | Profils des apprenants de ses cours | Tous les profils |
| Inscriptions et progression | Ses propres données | Étudiants associés uniquement | Cours gérés | Toutes |
| Remises | Ses fichiers et retours | Remises des étudiants associés | Cours gérés | Toutes |
| Groupes | Groupes dont il est membre | Groupes des étudiants associés | Groupes de cours gérés | Tous les groupes |
| Cours | Cours publiés et cours suivis | Cours des étudiants liés | Cours affectés/créés | Tous |
| Clés de correction de quiz | Jamais lisibles directement | Jamais lisibles directement | Gestion côté SQL/RLS | Gestion côté SQL/RLS |
| Certificat | Les siens | Ceux des étudiants associés | Cours gérés | Tous |

## Avant des données réelles

Tester sur un projet Supabase jetable les accès croisés entre étudiants, les tuteurs non associés, la modification du rôle, les fichiers à chemin falsifié, la taille/MIME, les liens signés expirés, la correction d’un quiz, la complétion d’un cours et l’émission/révocation d’un certificat. Vérifier également les limites de débit, le contrôle des abus, la conservation/suppression et les obligations de protection des données applicables.

Les policies actuelles sont une base implémentée, pas une certification de sécurité. Elles n’ont pas été exécutées dans ce dépôt faute de CLI/instance PostgreSQL. Toute donnée réelle doit attendre une validation RLS et stockage avec les quatre rôles.
