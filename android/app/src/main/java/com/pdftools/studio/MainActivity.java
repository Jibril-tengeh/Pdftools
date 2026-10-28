package com.pdftools.studio;

import android.os.Bundle;
import android.os.Build;
import android.os.Environment;
import android.webkit.JavascriptInterface;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.util.Base64;
import android.content.ContentValues;
import android.provider.MediaStore;
import android.app.DownloadManager;
import android.media.MediaScannerConnection;
import java.io.OutputStream;
import androidx.core.content.FileProvider;
import java.io.File;
import java.io.FileOutputStream;
import android.widget.Toast;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(DownloaderPlugin.class);
        super.onCreate(savedInstanceState);
        setupDownloader();
    }

    @Override
    public void onStart() {
        super.onStart();
        setupDownloader();
    }

    private void setupDownloader() {
        try {
            if (this.bridge != null && this.bridge.getWebView() != null) {
                this.bridge.getWebView().addJavascriptInterface(new DownloaderInterface(), "AndroidDownloader");
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public static boolean doSaveFile(Context context, android.app.Activity activity, String base64Data, String filename, String mimeType) {
        try {
            byte[] data = Base64.decode(base64Data, Base64.DEFAULT);

            // 1. Écriture physique directe dans le dossier Téléchargements (/storage/emulated/0/Download)
            File downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
            if (!downloadsDir.exists()) {
                downloadsDir.mkdirs();
            }

            File targetFile = new File(downloadsDir, filename);
            if (targetFile.exists()) {
                String nameOnly = filename.contains(".") ? filename.substring(0, filename.lastIndexOf('.')) : filename;
                String ext = filename.contains(".") ? filename.substring(filename.lastIndexOf('.')) : "";
                targetFile = new File(downloadsDir, nameOnly + "_" + (System.currentTimeMillis() % 10000) + ext);
            }

            try (FileOutputStream fos = new FileOutputStream(targetFile)) {
                fos.write(data);
                fos.flush();
            }

            final String savedFileName = targetFile.getName();
            final String savedFilePath = targetFile.getAbsolutePath();

            // 2. Sur Android 10+ (Q+), insérer également dans MediaStore avec la colonne RELATIVE_PATH obligatoire
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                try {
                    ContentValues values = new ContentValues();
                    values.put(MediaStore.Downloads.DISPLAY_NAME, savedFileName);
                    values.put(MediaStore.Downloads.MIME_TYPE, mimeType);
                    values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
                    values.put(MediaStore.Downloads.IS_PENDING, 0);

                    Uri collection = MediaStore.Downloads.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY);
                    Uri itemUri = context.getContentResolver().insert(collection, values);

                    if (itemUri != null) {
                        try (OutputStream os = context.getContentResolver().openOutputStream(itemUri)) {
                            if (os != null) {
                                os.write(data);
                                os.flush();
                            }
                        }
                    }
                } catch (Exception qEx) {
                    qEx.printStackTrace();
                }
            }

            // 3. Scanner le fichier avec MediaScannerConnection pour forcer son affichage immédiat dans le Gestionnaire de Fichiers
            try {
                MediaScannerConnection.scanFile(
                    context,
                    new String[]{ savedFilePath },
                    new String[]{ mimeType },
                    null
                );
            } catch (Exception scanEx) {
                scanEx.printStackTrace();
            }

            // 4. Enregistrer dans le DownloadManager officiel Android (pour apparaître dans l'app Téléchargements & notification)
            try {
                DownloadManager dm = (DownloadManager) context.getSystemService(Context.DOWNLOAD_SERVICE);
                if (dm != null) {
                    dm.addCompletedDownload(
                        savedFileName,
                        "Fichier PDF créé avec PDF Tools",
                        true,
                        mimeType,
                        savedFilePath,
                        targetFile.length(),
                        true
                    );
                }
            } catch (Exception dmEx) {
                dmEx.printStackTrace();
            }

            // 5. Notification Toast sur l'écran avec le chemin clair
            if (activity != null) {
                activity.runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        Toast.makeText(context, "✓ Enregistré dans Téléchargements : " + savedFileName, Toast.LENGTH_LONG).show();
                    }
                });
            }

            // 6. Ouvrir la feuille Android (Ouvrir avec un lecteur PDF ou Partager)
            try {
                File cacheFile = new File(context.getCacheDir(), savedFileName);
                try (FileOutputStream cacheFos = new FileOutputStream(cacheFile)) {
                    cacheFos.write(data);
                    cacheFos.flush();
                }

                Uri contentUri = FileProvider.getUriForFile(
                    context,
                    context.getPackageName() + ".fileprovider",
                    cacheFile
                );

                Intent sendIntent = new Intent(Intent.ACTION_SEND);
                sendIntent.setType(mimeType);
                sendIntent.putExtra(Intent.EXTRA_STREAM, contentUri);
                sendIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

                Intent chooser = Intent.createChooser(sendIntent, "Ouvrir ou partager " + savedFileName);
                chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(chooser);
            } catch (Exception shareEx) {
                shareEx.printStackTrace();
            }

            return true;
        } catch (OutOfMemoryError oom) {
            oom.printStackTrace();
            if (activity != null) {
                activity.runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        Toast.makeText(context, "Mémoire insuffisante pour ce fichier volumineux", Toast.LENGTH_LONG).show();
                    }
                });
            }
            return false;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    public class DownloaderInterface {
        @JavascriptInterface
        public boolean saveBase64File(String base64Data, String filename, String mimeType) {
            return doSaveFile(MainActivity.this, MainActivity.this, base64Data, filename, mimeType);
        }
    }

    @CapacitorPlugin(name = "AndroidDownloader")
    public static class DownloaderPlugin extends Plugin {
        @PluginMethod
        public void saveBase64File(PluginCall call) {
            String base64Data = call.getString("base64Data");
            String filename = call.getString("filename");
            String mimeType = call.getString("mimeType");

            boolean success = doSaveFile(getContext(), getActivity(), base64Data, filename, mimeType);
            if (success) {
                call.resolve();
            } else {
                call.reject("Erreur de sauvegarde");
            }
        }
    }
}
