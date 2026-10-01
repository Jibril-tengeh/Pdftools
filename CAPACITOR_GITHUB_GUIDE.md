# 📱 Guide : Compiler l'application avec Capacitor via GitHub Actions

Ce guide vous explique pas-à-pas comment compiler automatiquement votre application en **APK Android (et iOS)** directement sur les serveurs de **GitHub**, sans avoir besoin d'installer Android Studio ou Xcode sur votre ordinateur.

---

## ⚡ En résumé : comment obtenir votre fichier `.apk`

1. Poussez votre code sur votre dépôt GitHub (`git push origin main`).
2. Allez dans l'onglet **Actions** de votre dépôt GitHub.
3. Cliquez sur le workflow **« Build Android APK with Capacitor »**.
4. Cliquez sur **« Run workflow »**.
5. Après environ 3 à 5 minutes de compilation, téléchargez l'archive contenant votre **APK (`app-debug.apk`)** dans la section **Artifacts** en bas de la page du run !

---

## 🛠️ Configuration prête à l'emploi déjà intégrée

Le projet a été configuré avec :
- **`capacitor.config.ts`** : Configuration officielle de Capacitor avec identifiant de package `com.pdftools.studio`, nom `PDF Tools` et dossier web `dist`.
- **Dossier `/android` généré** : Projet natif Android 14/15 complet avec Gradle 8.14, plugins Capacitor et manifestes.
- **Workflow GitHub Actions (`.github/workflows/build-android.yml`)** :
  - Installe Node.js 20 et Java 21.
  - Compile le web avec Vite (`npm run build`).
  - Synchronise les fichiers vers Android (`npx cap sync android`).
  - Compile l'application avec Gradle (`./gradlew assembleDebug`).
  - Publie automatiquement l'APK téléchargeable dans les **Artifacts** du run GitHub Actions.
- **Workflow iOS (`.github/workflows/build-ios.yml`)** : Disponible pour compiler ou préparer le workspace Xcode sur machine macOS.

---

## 🚀 Étape 1 : Pousser votre projet sur GitHub

Si votre projet n'est pas encore sur GitHub :

```bash
# 1. Initialiser le dépôt git (si ce n'est pas déjà fait)
git init
git branch -M main

# 2. Ajouter vos fichiers
git add .
git commit -m "feat: configurer Capacitor et GitHub Actions pour build mobile"

# 3. Lier à votre dépôt GitHub distant
git remote add origin https://github.com/VOTRE_PSEUDO/VOTRE_DEPOT.git

# 4. Pousser les modifications
git push -u origin main
```

---

## 📥 Étape 2 : Lancer la compilation et télécharger l'APK

1. Ouvrez votre dépôt sur **github.com**.
2. Cliquez sur l'onglet **« Actions »** en haut de la page.
3. Dans la liste de gauche, sélectionnez **« Build Android APK with Capacitor »**.
4. Cliquez sur le bouton bleu **« Run workflow »** à droite, puis validez.
5. GitHub lance une machine virtuelle Ubuntu qui va :
   - Compiler l'application React Vite.
   - Synchroniser le projet natif Android.
   - Compiler les fichiers Java / Kotlin / C++ avec Gradle.
6. Une fois le workflow terminé avec une coche verte :
   - Cliquez sur le run qui vient de se terminer.
   - Faites défiler jusqu'à la section **Artifacts** (en bas de page).
   - Cliquez sur **`PDF-Tools-Android-Debug-APK`** pour télécharger le fichier `.zip` contenant l'APK !
   - Vous pouvez transférer directement cet APK sur votre smartphone ou tablette Android et l'installer.

---

## 💻 Étape 3 (Optionnel) : Commandes locales avec Capacitor

Si vous disposez d'Android Studio ou Xcode en local :

```bash
# 1. Compiler le code web et synchroniser les plateformes natives
npm run cap:build

# 2. Synchroniser uniquement Android
npm run cap:build:android

# 3. Ouvrir le projet directement dans Android Studio
npm run cap:open:android

# 4. Ouvrir le projet dans Xcode (sur macOS)
npm run cap:open:ios
```

---

## 🔐 Signer l'APK pour le Google Play Store (Production)

Si vous souhaitez publier votre application sur le Google Play Store :
1. Générez un fichier de clé (`.keystore` ou `.jks`) :
   ```bash
   keytool -genkey -v -keystore release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias pdftools
   ```
2. Convertissez ce keystore en base64 et ajoutez-le dans **Settings > Secrets and variables > Actions** de votre dépôt GitHub (`ANDROID_KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`).
3. Le workflow compilera et signera un fichier **`.aab` (Android App Bundle)** prêt à être importé sur la console Google Play.
