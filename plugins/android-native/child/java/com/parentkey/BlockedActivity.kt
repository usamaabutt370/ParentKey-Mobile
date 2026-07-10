package com.parentkey

import android.app.Activity
import android.graphics.Color
import android.os.Bundle
import android.view.Gravity
import android.widget.LinearLayout
import android.widget.TextView

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

    val title =
      TextView(this).apply {
        text = "App blocked"
        textSize = 28f
        setTextColor(Color.parseColor("#E6FFFB"))
        gravity = Gravity.CENTER
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

    setContentView(container)
  }

  companion object {
    const val EXTRA_BLOCKED_PACKAGE = "blocked_package"
  }
}
