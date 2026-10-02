package com.pdftools.studio;

import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.content.Intent;
import android.net.Uri;
import android.util.Base64;
import android.content.ContentValues;
import android.provider.MediaStore;
import java.io.OutputStream;
import androidx.core.content.FileProvider;
import java.io.File;
import java.io.FileOutputStream;
import android.widget.Toast;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private boolean isDownloaderAdded = false;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setupDownloader();
    }

    @Override
    public void onStart() {
        super.onStart();
        setupDownloader();
    }

    private void setupDownloader() {
        if (isDownloaderAdded) return;
        try {
            if (this.bridge != null && this.bridge.getWebView() != null) {
                this.bridge.getWebView().addJavascriptInterface(new Object() {
                    @JavascriptInterface
                    public boolean saveBase64File(String base64Data, String filename, String mimeType) {
                        try {
                            byte[] data = Base64.decode(base64Data, Base64.DEFAULT);

                            // 1. Enregistrement direct dans le dossier Téléchargements (Downloads) d'Android
                            try {
                                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
                                    ContentValues values = new ContentValues();
                                    values.put(MediaStore.Downloads.DISPLAY_NAME, filename);
                                    values.put(MediaStore.Downloads.MIME_TYPE, mimeType);
                                    values.put(MediaStore.Downloads.IS_PENDING, 1);

                                    Uri collection = MediaStore.Downloads.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY);
                                    Uri itemUri = getContentResolver().insert(collection, values);

                                    if (itemUri != null) {
                                        OutputStream os = getContentResolver().openOutputStream(itemUri);
                                        if (os != null) {
                                            os.write(data);
                                            os.close();
                                        }
                                        values.clear();
                                        values.put(MediaStore.Downloads.IS_PENDING, 0);
                                        getContentResolver().update(itemUri, values, null, null);
                                    }
                                } else {
                                    File downloadsDir = android.os.Environment.getExternalStoragePublicDirectory(android.os.Environment.DIRECTORY_DOWNLOADS);
                                    if (!downloadsDir.exists()) {
                                        downloadsDir.mkdirs();
                                    }
                                    File file = new File(downloadsDir, filename);
                                    FileOutputStream fos = new FileOutputStream(file);
                                    fos.write(data);
                                    fos.close();
                                }
                            } catch (Exception writeEx) {
                                writeEx.printStackTrace();
                            }

                            // Notification Toast pour l'utilisateur
                            runOnUiThread(new Runnable() {
                                @Override
                                public void run() {
                                    Toast.makeText(MainActivity.this, "✓ " + filename + " enregistré dans Téléchargements", Toast.LENGTH_LONG).show();
                                }
                            });

                            // 2. Proposer immédiatement la boîte native Android pour ouvrir ou partager
                            try {
                                File cacheFile = new File(getCacheDir(), filename);
                                FileOutputStream fos = new FileOutputStream(cacheFile);
                                fos.write(data);
                                fos.close();

                                Uri contentUri = FileProvider.getUriForFile(
                                    MainActivity.this,
                                    getPackageName() + ".fileprovider",
                                    cacheFile
                                );

                                Intent sendIntent = new Intent(Intent.ACTION_SEND);
                                sendIntent.setType(mimeType);
                                sendIntent.putExtra(Intent.EXTRA_STREAM, contentUri);
                                sendIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

                                Intent chooser = Intent.createChooser(sendIntent, "Ouvrir ou partager " + filename);
                                chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                                startActivity(chooser);
                            } catch (Exception shareEx) {
                                shareEx.printStackTrace();
                            }

                            return true;
                        } catch (Exception e) {
                            e.printStackTrace();
                            runOnUiThread(new Runnable() {
                                @Override
                                public void run() {
                                    Toast.makeText(MainActivity.this, "Erreur enregistrement: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                                }
                            });
                            return false;
                        }
                    }
                }, "AndroidDownloader");
                isDownloaderAdded = true;
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
