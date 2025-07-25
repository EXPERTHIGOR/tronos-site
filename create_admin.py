#!/usr/bin/env python3
import os
import sys
from datetime import date

# Adicionar o diretório src ao path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from src.main import app
from src.models.tronos_models import db, TronosUser

def create_admin():
    with app.app_context():
        # Verificar se já existe admin
        admin = TronosUser.query.filter_by(user_type='admin').first()
        if admin:
            print(f'Admin já existe: {admin.email}')
            return
        
        # Criar usuário admin
        admin = TronosUser(
            login='admin',
            email='admin@tronos.com',
            full_name='Administrador',
            user_type='admin',
            birth_date=date(1990, 1, 1),
            whatsapp='11999999999',
            is_approved=True
        )
        admin.set_password('admin123')
        
        db.session.add(admin)
        db.session.commit()
        
        print('✅ Admin criado com sucesso!')
        print('📧 Email: admin@tronos.com')
        print('🔑 Senha: admin123')

if __name__ == '__main__':
    create_admin()

