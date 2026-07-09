package dev.erancihan.justads

import android.app.Activity
import android.app.Application
import android.os.Bundle
import dev.erancihan.justads.di.AndroidAppDependencies

/**
 * Owns the app-wide [AndroidAppDependencies] (so the DB/driver isn't rebuilt on rotation) and
 * tracks the current Activity, which the ads SDK needs to present full-screen ads.
 */
class JustAdsApplication : Application() {
    // Settable so MainActivity can attach itself in onCreate() — before the ViewModel's
    // consent flow runs, which needs a non-null Activity (the ActivityLifecycleCallbacks'
    // onActivityResumed fires too late for cold-start consent).
    var currentActivity: Activity? = null

    lateinit var dependencies: AndroidAppDependencies
        private set

    override fun onCreate() {
        super.onCreate()
        dependencies = AndroidAppDependencies(applicationContext) { currentActivity }
        registerActivityLifecycleCallbacks(object : SimpleActivityLifecycleCallbacks() {
            override fun onActivityResumed(activity: Activity) { currentActivity = activity }
            override fun onActivityPaused(activity: Activity) {
                if (currentActivity === activity) currentActivity = null
            }
        })
    }
}

/** Empty defaults so subclasses override only what they need. */
abstract class SimpleActivityLifecycleCallbacks : Application.ActivityLifecycleCallbacks {
    override fun onActivityCreated(activity: Activity, savedInstanceState: Bundle?) {}
    override fun onActivityStarted(activity: Activity) {}
    override fun onActivityResumed(activity: Activity) {}
    override fun onActivityPaused(activity: Activity) {}
    override fun onActivityStopped(activity: Activity) {}
    override fun onActivitySaveInstanceState(activity: Activity, outState: Bundle) {}
    override fun onActivityDestroyed(activity: Activity) {}
}
