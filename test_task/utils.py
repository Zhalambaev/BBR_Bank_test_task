import json


def fix_condition_json(doc, method=None):
    """Фиксим ошибку по condition_json при использовании postgres."""
    value = doc.get('condition_json')

    if isinstance(value, str):
        try:
            value = json.loads(value)
        except Exception:
            return

    if isinstance(value, list):
        doc.condition_json = {'filters': value}
    elif value is None:
        doc.condition_json = {}
