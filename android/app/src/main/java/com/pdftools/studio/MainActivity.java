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

    public static boolean doSaveFile(android.content.Context context, android.app.Activity activity, String base64Data, String filename, String mimeType) {
        try {
            byte[] data = Base64.decode(base64Data, Base64.DEFAULT);

            try {
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
                    ContentValues values = new ContentValues();
                    values.put(MediaStore.Downloads.DISPLAY_NAME, filename);
                    values.put(MediaStore.Downloads.MIME_TYPE, mimeType);
                    values.put(MediaStore.Downloads.IS_PENDING, 1);

                    Uri collection = MediaStore.Downloads.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY);
                    Uri itemUri = context.getContentResolver().insert(collection, values);

                    if (itemUri != null) {
                        OutputStream os = context.getContentResolver().openOutputStream(itemUri);
                        if (os != null) {
                            os.write(data);
                            os.close();
                        }
                        values.clear();
                        values.put(MediaStore.Downloads.IS_PENDING, 0);
                        context.getContentResolver().update(itemUri, values, null, null);
                    }
                } else {
                    File downloadsDir = android.os.Environment.getExternalStoragePublicDirectory(android.os.Environment.DIRECTORY_DOWNLOADS);
                    if (!downloadsDir.exists()) downloadsDir.mkdirs();
                    File file = new File(downloadsDir, filename);
                    FileOutputStream fos = new FileOutputStream(file);
                    fos.write(data);
                    fos.close();
                }
            } catch (Exception writeEx) {
                writeEx.printStackTrace();
            }

            if (activity != null) {
                activity.runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        Toast.makeText(context, "✓ " + filename + " enregistré dans Téléchargements", Toast.LENGTH_LONG).show();
                    }
                });
            }

            try {
                File cacheFile = new File(context.getCacheDir(), filename);
                FileOutputStream fos = new FileOutputStream(cacheFile);
                fos.write(data);
                fos.close();

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

            return true;
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
