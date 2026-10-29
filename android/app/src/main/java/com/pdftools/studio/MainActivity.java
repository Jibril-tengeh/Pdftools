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
import java.util.List;
import java.util.ArrayList;
import android.content.pm.PackageManager;
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
        requestStoragePermissions();
    }

    @Override
    public void onStart() {
        super.onStart();
        setupDownloader();
    }

    private void requestStoragePermissions() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            List<String> perms = new ArrayList<>();
            if (checkSelfPermission(android.Manifest.permission.WRITE_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
                perms.add(android.Manifest.permission.WRITE_EXTERNAL_STORAGE);
            }
            if (checkSelfPermission(android.Manifest.permission.READ_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
                perms.add(android.Manifest.permission.READ_EXTERNAL_STORAGE);
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                if (checkSelfPermission(android.Manifest.permission.READ_MEDIA_IMAGES) != PackageManager.PERMISSION_GRANTED) {
                    perms.add(android.Manifest.permission.READ_MEDIA_IMAGES);
                }
                if (checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                    perms.add(android.Manifest.permission.POST_NOTIFICATIONS);
                }
            }
            if (!perms.isEmpty()) {
                requestPermissions(perms.toArray(new String[0]), 2001);
            }
        }
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
            boolean saved = false;

            // 1. Sauvegarde via MediaStore officiel Android 10+ (Range dans Download sur le stockage sans blocage de permission)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                try {
                    ContentValues values = new ContentValues();
                    values.put(MediaStore.MediaColumns.DISPLAY_NAME, filename);
                    values.put(MediaStore.MediaColumns.MIME_TYPE, mimeType);
                    values.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
                    values.put(MediaStore.MediaColumns.IS_PENDING, 1);

                    Uri collection = MediaStore.Downloads.EXTERNAL_CONTENT_URI;
                    Uri itemUri = context.getContentResolver().insert(collection, values);

                    if (itemUri != null) {
                        try (OutputStream os = context.getContentResolver().openOutputStream(itemUri)) {
                            if (os != null) {
                                os.write(data);
                                os.flush();
                                saved = true;
                            }
                        }
                        values.clear();
                        values.put(MediaStore.MediaColumns.IS_PENDING, 0);
                        context.getContentResolver().update(itemUri, values, null, null);
                    }
                } catch (Exception qEx) {
                    qEx.printStackTrace();
                }
            }

            // 2. Écriture physique directe dans /storage/emulated/0/Download
            File directTargetFile = null;
            try {
                File downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                if (!downloadsDir.exists()) {
                    downloadsDir.mkdirs();
                }

                directTargetFile = new File(downloadsDir, filename);
                if (directTargetFile.exists()) {
                    String nameOnly = filename.contains(".") ? filename.substring(0, filename.lastIndexOf('.')) : filename;
                    String ext = filename.contains(".") ? filename.substring(filename.lastIndexOf('.')) : "";
                    directTargetFile = new File(downloadsDir, nameOnly + "_" + (System.currentTimeMillis() % 10000) + ext);
                }

                try (FileOutputStream fos = new FileOutputStream(directTargetFile)) {
                    fos.write(data);
                    fos.flush();
                    saved = true;
                }

                // Scanner pour actualiser le gestionnaire de fichiers
                MediaScannerConnection.scanFile(
                    context,
                    new String[]{ directTargetFile.getAbsolutePath() },
                    new String[]{ mimeType },
                    null
                );
            } catch (Exception directEx) {
                directEx.printStackTrace();
            }

            // 3. Enregistrer dans le DownloadManager officiel Android
            if (directTargetFile != null && directTargetFile.exists()) {
                try {
                    DownloadManager dm = (DownloadManager) context.getSystemService(Context.DOWNLOAD_SERVICE);
                    if (dm != null) {
                        dm.addCompletedDownload(
                            directTargetFile.getName(),
                            "Fichier PDF créé avec PDF Tools",
                            true,
                            mimeType,
                            directTargetFile.getAbsolutePath(),
                            directTargetFile.length(),
                            true
                        );
                    }
                } catch (Exception dmEx) {
                    dmEx.printStackTrace();
                }
            }

            // 4. Notification Toast sur l'écran
            if (activity != null) {
                activity.runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        Toast.makeText(context, "✓ Fichier enregistré dans Téléchargements : " + filename, Toast.LENGTH_LONG).show();
                    }
                });
            }

            // 5. Ouvrir la feuille Android (Ouvrir avec un lecteur PDF ou Enregistrer dans Fichiers)
            try {
                File cacheFile = new File(context.getCacheDir(), filename);
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

                Intent chooser = Intent.createChooser(sendIntent, "Ouvrir ou partager " + filename);
                chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(chooser);
            } catch (Exception shareEx) {
                shareEx.printStackTrace();
            }

            return saved;
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

        @JavascriptInterface
        public void requestStoragePermissions() {
            MainActivity.this.requestStoragePermissions();
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
