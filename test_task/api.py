import frappe

from dadata import Dadata
from typing import List, Literal


PartyKey = Literal['designation', 'inn', 'get_address']


API = 'd53f53f62a3a177aef4d83f6c82473ba400dbc4e'
SECRET = '445ac3fc0df354166e63d6a08182230de03644c1'


@frappe.whitelist()
def dadata_get_data(key: str, query: str) -> list | str:
    api = DadataAPI(api_key=API, secret_key=SECRET)
    return api.get_data(key=key, query=query)


class DadataAPI:
    "Класс для обращения к Dadata."
    PARTY = 'party'

    def __init__(self, api_key: str, secret_key: str):
        self.api_key = api_key
        self.secret_key = secret_key

    def _get_info(self, query: str) -> List[dict]:
        """Метод получает информацию по ключу
        и возвращает данные об организации.
        """
        if not query:
            return []

        with Dadata(self.api_key, self.secret_key) as dadata:
            data = dadata.suggest(name=self.PARTY, query=query)
            if data:
                return data

            return []

    def _get_address(self, query) -> str:
        """Метод получает ИНН и возвращает адрес организации."""
        if not query:
            return ''

        with Dadata(self.api_key, self.secret_key) as dadata:
            data = dadata.find_by_id(name=self.PARTY, query=query)
            if data:
                address = data[0].get('data', {}).get('address', {}).get('value')

                return address

            return ''

    def _required_data(self, data) -> List[dict]:
        """Метод собирает необходимые данные и возвращает список словарей."""

        if not data:
            return []

        req_data = []
        for element in data:
            organization = {}
            organization['designation'] = element.get('value')
            organization['inn'] = element.get('data', {}).get('inn')
            organization['kpp'] = element.get('data', {}).get('kpp', '')
            req_data.append(organization)

        return req_data

    def get_data(self, key, query) -> List[dict] | str:
        if key == 'designation' or key == 'inn':
            data = self._get_info(query=query)
            return self._required_data(data)
        elif key == 'get_address':
            return self._get_address(query=query)
        else:
            return []
