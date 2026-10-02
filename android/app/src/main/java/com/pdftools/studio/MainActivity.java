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
import android.app.NotificationManager;
import android.app.NotificationChannel;
import android.app.PendingIntent;
import android.app.DownloadManager;
import android.media.MediaScannerConnection;
import java.io.OutputStream;
import androidx.core.content.FileProvider;
import androidx.core.app.NotificationCompat;
import java.io.File;
import java.io.FileOutputStream;
import android.widget.Toast;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

public class MainActivity extends BridgeActivity {

    private static final String NOTIF_CHANNEL_ID = "pdftools_downloads";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(DownloaderPlugin.class);
        super.onCreate(savedInstanceState);
        createNotificationChannel();
        setupDownloader();
    }

    @Override
    public void onStart() {
        super.onStart();
        setupDownloader();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                NOTIF_CHANNEL_ID,
                "Téléchargements PDF Tools",
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Notifications des fichiers enregistrés");
            channel.enableVibration(true);
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                nm.createNotificationChannel(channel);
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

            // 1. Écriture physique dans le dossier public Téléchargements (/storage/emulated/0/Download)
            File downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
            if (!downloadsDir.exists()) {
                downloadsDir.mkdirs();
            }

            File targetFile = new File(downloadsDir, filename);
            // Si un fichier du même nom existe déjà, générer un nom unique
            if (targetFile.exists()) {
                String nameOnly = filename.contains(".") ? filename.substring(0, filename.lastIndexOf('.')) : filename;
                String ext = filename.contains(".") ? filename.substring(filename.lastIndexOf('.')) : "";
                targetFile = new File(downloadsDir, nameOnly + "_" + System.currentTimeMillis() % 10000 + ext);
            }

            FileOutputStream fos = new FileOutputStream(targetFile);
            fos.write(data);
            fos.flush();
            fos.close();

            // 2. Également insérer dans MediaStore sur Android 10+ pour compatibilité maximale
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                try {
                    ContentValues values = new ContentValues();
                    values.put(MediaStore.Downloads.DISPLAY_NAME, targetFile.getName());
                    values.put(MediaStore.Downloads.MIME_TYPE, mimeType);
                    values.put(MediaStore.Downloads.IS_PENDING, 0);

                    Uri collection = MediaStore.Downloads.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY);
                    Uri itemUri = context.getContentResolver().insert(collection, values);
                    if (itemUri != null) {
                        OutputStream os = context.getContentResolver().openOutputStream(itemUri);
                        if (os != null) {
                            os.write(data);
                            os.close();
                        }
                    }
                } catch (Exception qEx) {
                    qEx.printStackTrace();
                }
            }

            // 3. Forcer le scan immédiat par le Gestionnaire de Fichiers (File Manager)
            final String finalFilePath = targetFile.getAbsolutePath();
            final String finalFileName = targetFile.getName();
            MediaScannerConnection.scanFile(
                context,
                new String[]{ finalFilePath },
                new String[]{ mimeType },
                new MediaScannerConnection.OnScanCompletedListener() {
                    @Override
                    public void onScanCompleted(String path, Uri uri) {
                        // Fichier indexé avec succès dans le File Manager
                    }
                }
            );

            // 4. Enregistrer dans le DownloadManager système officiel Android
            try {
                DownloadManager dm = (DownloadManager) context.getSystemService(Context.DOWNLOAD_SERVICE);
                if (dm != null) {
                    dm.addCompletedDownload(
                        finalFileName,
                        "Fichier PDF créé avec PDF Tools",
                        true,
                        mimeType,
                        finalFilePath,
                        targetFile.length(),
                        true // Affiche la notification de téléchargement dans la barre système !
                    );
                }
            } catch (Exception dmEx) {
                dmEx.printStackTrace();
            }

            // 5. Afficher une Notification Système dans le volet déroulant Android
            try {
                NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
                Uri fileUri = FileProvider.getUriForFile(
                    context,
                    context.getPackageName() + ".fileprovider",
                    targetFile
                );

                Intent openIntent = new Intent(Intent.ACTION_VIEW);
                openIntent.setDataAndType(fileUri, mimeType);
                openIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);

                PendingIntent pendingIntent = PendingIntent.getActivity(
                    context,
                    (int) (System.currentTimeMillis() % 100000),
                    openIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
                );

                NotificationCompat.Builder notifBuilder = new NotificationCompat.Builder(context, NOTIF_CHANNEL_ID)
                    .setSmallIcon(android.R.drawable.stat_sys_download_done)
                    .setContentTitle("Téléchargement terminé")
                    .setContentText(finalFileName + " enregistré dans Téléchargements")
                    .setStyle(new NotificationCompat.BigTextStyle().bigText(finalFileName + " a été enregistré dans votre dossier Téléchargements. Touchez pour l'ouvrir."))
                    .setPriority(NotificationCompat.PRIORITY_HIGH)
                    .setAutoCancel(true)
                    .setContentIntent(pendingIntent);

                if (nm != null) {
                    nm.notify((int) (System.currentTimeMillis() % 100000), notifBuilder.build());
                }
            } catch (Exception notifEx) {
                notifEx.printStackTrace();
            }

            // 6. Notification Toast sur l'écran
            if (activity != null) {
                activity.runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        Toast.makeText(context, "✓ " + finalFileName + " enregistré dans Téléchargements", Toast.LENGTH_LONG).show();
                    }
                });
            }

            // 7. Ouvrir la feuille Android (Ouvrir avec un lecteur PDF ou Partager)
            try {
                File cacheFile = new File(context.getCacheDir(), finalFileName);
                FileOutputStream cacheFos = new FileOutputStream(cacheFile);
                cacheFos.write(data);
                cacheFos.close();

                Uri contentUri = FileProvider.getUriForFile(
                    context,
                    context.getPackageName() + ".fileprovider",
                    cacheFile
                );

                Intent sendIntent = new Intent(Intent.ACTION_SEND);
                sendIntent.setType(mimeType);
                sendIntent.putExtra(Intent.EXTRA_STREAM, contentUri);
                sendIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

                Intent chooser = Intent.createChooser(sendIntent, "Ouvrir ou partager " + finalFileName);
                chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(chooser);
            } catch (Exception shareEx) {
                shareEx.printStackTrace();
            }

            return true;
        } catch (Exception e) {
            e.printStackTrace();
            if (activity != null) {
                activity.runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        Toast.makeText(context, "Erreur enregistrement: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                    }
                });
            }
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
