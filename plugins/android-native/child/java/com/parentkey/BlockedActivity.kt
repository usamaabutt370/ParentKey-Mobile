package com.parentkey

import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.os.Bundle
import android.view.Gravity
import android.widget.LinearLayout
import android.widget.TextView

/**
 * Normal Activity shown after a blocked app is closed. Unlike an accessibility
 * overlay, system Home / Back always work here.
 */
class BlockedActivity : Activity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    val blockedPackage = intent.getStringExtra(EXTRA_BLOCKED_PACKAGE)

    val container =
      LinearLayout(this).apply {
        orientation = LinearLayout.VERTICAL
        gravity = Gravity.CENTER
        setBackgroundColor(Color.parseColor("#0B1F24"))
        setPadding(48, 48, 48, 48)
      }

    val lockIcon =
      TextView(this).apply {
        text = "🔒"
        textSize = 72f
        gravity = Gravity.CENTER
      }

    val title =
      TextView(this).apply {
        text = "App blocked"
        textSize = 28f
        setTextColor(Color.parseColor("#E6FFFB"))
        gravity = Gravity.CENTER
        setTypeface(typeface, Typeface.BOLD)
        setPadding(0, 24, 0, 0)
      }

    val subtitle =
      TextView(this).apply {
        text =
          "This app is blocked by ParentKey.\nAsk your parent if you need access."
        textSize = 16f
        setTextColor(Color.parseColor("#9FB8B2"))
        gravity = Gravity.CENTER
        setPadding(0, 16, 0, 0)
      }

    container.addView(lockIcon)
    container.addView(title)
    container.addView(subtitle)

    if (!blockedPackage.isNullOrBlank()) {
      val packageLabel =
        TextView(this).apply {
          text = blockedPackage
          textSize = 12f
          setTextColor(Color.parseColor("#5F7A74"))
          gravity = Gravity.CENTER
          setPadding(0, 24, 0, 0)
        }
      container.addView(packageLabel)
    }

    val homeButton =
      TextView(this).apply {
        text = "Go to home screen"
        textSize = 16f
        gravity = Gravity.CENTER
        setTextColor(Color.parseColor("#0B1F24"))
        setTypeface(typeface, Typeface.BOLD)
        setBackgroundColor(Color.parseColor("#2DD4BF"))
        setPadding(40, 28, 40, 28)
        isClickable = true
        setPadding(40, 28, 40, 28)
        setOnClickListener { goHomeAndFinish() }
      }
    val buttonWrap =
      LinearLayout(this).apply {
        gravity = Gravity.CENTER
        setPadding(0, 40, 0, 0)
        addView(homeButton)
      }
    container.addView(buttonWrap)

    setContentView(container)
  }

  @Deprecated("Deprecated in Java")
  override fun onBackPressed() {
    goHomeAndFinish()
  }

  private fun goHomeAndFinish() {
    val home =
      Intent(Intent.ACTION_MAIN).apply {
        addCategory(Intent.CATEGORY_HOME)
        flags = Intent.FLAG_ACTIVITY_NEW_TASK
      }
    startActivity(home)
    finish()
  }

  companion object {
    const val EXTRA_BLOCKED_PACKAGE = "blocked_package"
  }
}
