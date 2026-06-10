# TP JWT + MongoDB vulnérable

Application NodeJS + Express + MongoDB volontairement vulnérable pour un TP de cybersécurité en environnement local.

## Lancement

```bash
docker compose up --build
```

Puis ouvrir :

```txt
http://localhost:3000
```

## Comptes

```txt
admin / admin123
alice / alice123
bob / bob123
charlie / charlie123
```


## Endpoints utiles

```txt
POST /api/auth/login
GET  /api/me
GET  /api/users
GET  /api/users/:id
GET  /api/posts
GET  /api/posts?includeAdmin=true
POST /api/posts
GET  /api/admin
GET  /api/debug/config
```

## Remise à zéro de la base

```bash
docker compose down -v
docker compose up --build
```

## Note sécurité

Ce projet est volontairement vulnérable. Il doit rester en local ou sur un réseau de lab isolé.
Ne pas exposer sur Internet.
