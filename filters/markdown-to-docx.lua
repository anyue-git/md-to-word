function RawInline(raw)
  if raw.format ~= "html" then
    return nil
  end

  local text = raw.text
  local sub = text:match("^<sub>(.-)</sub>$")
  if sub then
    return pandoc.Subscript({ pandoc.Str(sub) })
  end

  local sup = text:match("^<sup>(.-)</sup>$")
  if sup then
    return pandoc.Superscript({ pandoc.Str(sup) })
  end

  local underline = text:match("^<u>(.-)</u>$")
  if underline then
    return pandoc.Underline({ pandoc.Str(underline) })
  end

  local colored = text:match('^<span%s+style="color:[^"]+">(.-)</span>$')
  if colored then
    return pandoc.Span({ pandoc.Str(colored) }, pandoc.Attr("", {}, { ["custom-style"] = "Colored Text" }))
  end

  if text == "<br>" or text == "<br/>" or text == "<br />" then
    return pandoc.LineBreak()
  end

  return nil
end
