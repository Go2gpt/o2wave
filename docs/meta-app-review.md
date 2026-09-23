# Meta App Review — o2Wave (publicación directa para usuarios)

Objetivo: obtener **Acceso Avanzado (Advanced Access)** a los permisos que permiten a un
usuario conectar SU cuenta de Instagram/Facebook y publicar desde o2Wave.

> ⚠️ Los textos que se pegan EN EL PANEL DE META van **en inglés** (los revisores son
> internacionales). Abajo tienes cada texto listo para copiar. Las explicaciones para ti
> van en español.

---

## 0. Requisitos previos (estado)

| Requisito | Estado |
|---|---|
| Verificación del negocio (Business Verification) | ✅ Hecho (23 sept 2026) |
| Privacy Policy URL | ✅ `https://o2wave.app/privacidad` |
| User Data Deletion (Instructions URL) | ✅ `https://o2wave.app/eliminar-datos` |
| App en modo **Live** (no Development) | ⬜ Activar el toggle antes de enviar |
| Categoría de la app + icono | ⬜ Revisar en Configuración básica |
| Facebook Login for Business configurado | ✅ (OAuth ya funciona) |

**Dónde pegar las URLs:** Panel de Meta → **App Settings → Basic**:
- *Privacy Policy URL* → `https://o2wave.app/privacidad`
- *User Data Deletion* → elegir **"Data Deletion Instructions URL"** → `https://o2wave.app/eliminar-datos`

---

## 1. Permisos a solicitar

Para el caso de uso "el usuario conecta su cuenta y publica desde o2Wave":

1. `instagram_content_publish` — publicar imágenes/reels en Instagram Business/Creator.
2. `pages_manage_posts` — publicar posts en la Página de Facebook del usuario.
3. `pages_read_engagement` — leer datos básicos de la Página (necesario para publicar).
4. `pages_show_list` — listar las Páginas que el usuario administra (para que elija).
5. `business_management` *(si lo pide el flujo)* — gestionar los activos del negocio conectados.

> `email` y `public_profile` son de acceso estándar, no requieren review.

---

## 2. Justificación por permiso (copiar en inglés)

### `instagram_content_publish`
```
o2Wave is a content-creation tool for nonprofits and small organizations. After the user
connects their own Instagram Business/Creator account via Facebook Login, o2Wave lets them
publish the image posts they created in the app directly to that account, so they don't have
to manually download and re-upload. We use instagram_content_publish only to publish content
the user explicitly creates and confirms inside o2Wave, to the account they connected. We do
not publish without an explicit user action.
```

### `pages_manage_posts`
```
Users connect their own Facebook Page to o2Wave to publish the posts they create in the app.
We use pages_manage_posts to publish a photo/text post to the Page the user selected, only
when the user taps "Publish" for that specific post. We never post automatically without a
direct user action.
```

### `pages_read_engagement`
```
We use pages_read_engagement to read the basic information of the Page the user connected
(Page id, name and its linked Instagram Business account) which is required by the Graph API
to publish content on their behalf. We do not use it to collect analytics for commercial
purposes.
```

### `pages_show_list`
```
When the user connects their account, o2Wave uses pages_show_list to display the list of
Facebook Pages the user administers, so the user can choose which Page (and its linked
Instagram account) they want to connect and publish to. The user always selects the target
account explicitly.
```

### `business_management` (solo si aparece requerido)
```
Some users manage their Pages and Instagram accounts through a Meta Business Portfolio.
o2Wave uses business_management to access the Pages/Instagram assets the user authorizes so
they can select them as publishing targets. Access is limited to assets the user explicitly
grants during login.
```

---

## 3. Pasos para el revisor (Reviewer Instructions — pegar en inglés)

> Meta pide "Step-by-step instructions" + normalmente un **screencast**. Además, conviene
> darles credenciales de una cuenta de prueba de o2Wave que YA tenga permitida la función
> (ver nota abajo).

```
Test account for o2Wave (web app): https://o2wave.app
Email: [CREAR CUENTA DE PRUEBA]  Password: [CONTRASEÑA]

Steps to reproduce the use of the permissions:
1. Log in at https://o2wave.app with the test credentials above.
2. Go to "Perfil" (Profile) from the bottom menu.
3. Scroll to "Cuentas conectadas" (Connected accounts) and tap "+ Conectar una cuenta".
4. You are redirected to Facebook Login. Approve the requested permissions and select a
   Facebook Page that has a linked Instagram Business account.  -> uses pages_show_list,
   pages_read_engagement, business_management.
5. Back in o2Wave, go to "Crear" (Create) and generate a post (text + image), or open the
   weekly pack.
6. On any Instagram/Facebook post, tap "Publicar en tu cuenta" (Publish to your account),
   choose the connected account and confirm.  -> uses instagram_content_publish /
   pages_manage_posts.
7. The post appears on the connected Instagram/Facebook account.

Data deletion: users can disconnect accounts in Perfil > Cuentas conectadas, or delete all
their data at https://o2wave.app/eliminar-datos
```

**Nota importante sobre la cuenta de prueba:** el revisor de Meta no es admin de tu app, así
que para que la función NO le dé error durante la review, hay dos caminos:
- **(A) Recomendado:** graba un **screencast** con TU cuenta (que ya tiene la función activa)
  mostrando los pasos 3–7. Es lo que más peso tiene y evita dependencias.
- **(B)** Crear una cuenta de prueba en o2Wave y marcarla como habilitada (poner su email en
  `es_admin` o abrir la función). Si haces esto, dales las credenciales arriba.

---

## 4. Guion del vídeo demo (screencast)

Grábalo con el móvil o pantalla del ordenador, 60–90 s, sin cortes bruscos. Sube el MP4 en
la sección de cada permiso (o uno general).

1. **(0:00)** Muestra `o2wave.app`, ya con sesión iniciada. Di/rotula: "This is o2Wave, a
   content tool for nonprofits."
2. **(0:05)** Ve a **Perfil → Cuentas conectadas**. Rotula: "The user connects their own
   Instagram/Facebook."
3. **(0:10)** Pulsa **"+ Conectar una cuenta"** → aparece el login de Facebook. Muestra la
   pantalla de permisos de Facebook y la **selección de Página** (aquí se ven pages_show_list
   / pages_read_engagement).
4. **(0:25)** Vuelve a o2Wave: aparece la cuenta conectada en la lista.
5. **(0:32)** Ve a **Crear** (o al pack) y abre un post con imagen.
6. **(0:40)** Pulsa **"Publicar en tu cuenta"**, elige la cuenta y confirma. Espera el ✓ de
   publicado (aquí se ve instagram_content_publish / pages_manage_posts).
7. **(0:55)** Abre Instagram/Facebook y muestra el post **ya publicado**. Rotula: "Published
   directly from o2Wave."
8. **(1:05)** Enseña brevemente **Perfil → Desconectar** y la página
   `o2wave.app/eliminar-datos`. Rotula: "Users can disconnect or delete their data anytime."

---

## 5. Checklist de envío

- [ ] App en modo **Live**.
- [ ] Privacy Policy URL y Data Deletion URL guardadas en App Settings → Basic.
- [ ] Categoría e icono de la app rellenos.
- [ ] Cada permiso con su justificación (sección 2) + screencast (sección 4).
- [ ] Reviewer instructions (sección 3) pegadas.
- [ ] (Si vas por la opción B) cuenta de prueba creada y habilitada.
- [ ] Enviar y esperar (suele tardar de días a ~2 semanas).

## 6. Cuando lo aprueben

Poner en Vercel la variable de entorno:
```
PUBLICACION_DIRECTA_ABIERTA=true
```
Con eso la publicación directa se abre a TODOS los usuarios (sin tocar código). Y anunciamos
la actualización (v3.0).
