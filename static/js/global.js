function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}
