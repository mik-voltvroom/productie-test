def car_entities(value):
    """Read arrays and graph containers without matching nested seller/offer objects."""
    if isinstance(value, list):
        return [car for node in value for car in car_entities(node)]
    if not isinstance(value, dict):
        return []
    types = value.get('@type', [])
    if isinstance(types, str):
        types = [types]
    return ([value] if 'Car' in types else []) + car_entities(value.get('@graph'))
