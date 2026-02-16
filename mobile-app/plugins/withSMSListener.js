const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Config plugin to add SMS listener permissions and receiver to AndroidManifest.xml
 */
const withSMSListener = (config) => {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults.manifest;

    // Ensure application tag exists
    if (!androidManifest.application) {
      androidManifest.application = [{}];
    }

    const application = androidManifest.application[0];

    // Add SMS receiver
    if (!application.receiver) {
      application.receiver = [];
    }

    // Check if receiver already exists
    const receiverExists = application.receiver.some(
      (receiver) => receiver.$?.['android:name'] === 'com.centaurwarchief.smslistener.SmsReceiver'
    );

    if (!receiverExists) {
      application.receiver.push({
        $: {
          'android:name': 'com.centaurwarchief.smslistener.SmsReceiver',
          'android:exported': 'true',
        },
        'intent-filter': [
          {
            action: [
              {
                $: {
                  'android:name': 'android.provider.Telephony.SMS_RECEIVED',
                },
              },
            ],
          },
        ],
      });
    }

    return config;
  });
};

module.exports = withSMSListener;
