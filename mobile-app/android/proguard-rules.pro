# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt

# React Native
-keep,allowobfuscation @interface com.facebook.proguard.annotations.DoNotStrip
-keep,allowobfuscation @interface com.facebook.proguard.annotations.KeepGettersAndSetters
-keep @com.facebook.proguard.annotations.DoNotStrip class *
-keepclassmembers class * {
    @com.facebook.proguard.annotations.DoNotStrip *;
}
-keepclassmembers @com.facebook.proguard.annotations.KeepGettersAndSetters class * {
  void set*(***);
  *** get*();
}

# Hermes
-keep class com.facebook.hermes.unicode.** { *; }
-keep class com.facebook.jni.** { *; }

# React Native SMS Listener
-keep class com.centaurwarchief.smslistener.** { *; }
-keepclassmembers class com.centaurwarchief.smslistener.** { *; }

# Expo
-keep class expo.** { *; }
-keep class versioned.host.exp.exponent.** { *; }

# AsyncStorage
-keep class com.reactnativecommunity.asyncstorage.** { *; }

# React Native Navigation
-keep class com.swmansion.** { *; }
-keep class com.th3rdwave.** { *; }

# Preserve line numbers for debugging stack traces
-keepattributes SourceFile,LineNumberTable

# Keep custom exceptions for crash reporting
-keep public class * extends java.lang.Exception

# If you keep the line number information, uncomment this to
# hide the original source file name.
-renamesourcefileattribute SourceFile
