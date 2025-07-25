#!/usr/bin/env python3
"""Script para criar usuário de teste"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from main import app
from models.tronos_models import db, TronosUser

def create_test_user():
    with app.app_context():
        # Inicializar banco se necessário
        db.create_all()
        
        # Verificar se usuário já existe
        existing_user = TronosUser.query.filter_by(login='agente_teste').first()
        if existing_user:
            print("Usuário de teste já existe")
            return
        
        # Criar usuário agente de teste
        test_user = TronosUser(
            login='agente_teste',
            email='agente@teste.com',
            full_name='Agente de Teste',
            user_type='agent',
            channel_name='Canal Teste',
            function='Editor principal',
            whatsapp='11999999999',
            birth_date='1990-01-01',
            registration_code='TESTE123',
            represented_creator='Criador Teste',
            is_approved=True  # Já aprovado para teste
        )
        
        test_user.set_password('teste123')
        
        db.session.add(test_user)
        db.session.commit()
        
        print("Usuário de teste criado com sucesso!")
        print("Login: agente_teste")
        print("Senha: teste123")

if __name__ == '__main__':
    create_test_user()

