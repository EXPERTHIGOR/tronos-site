#!/usr/bin/env python3
import os
import sys
from datetime import datetime, date

# Adicionar o diretório pai ao path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from src.main import app
from src.models.tronos_models import db, TronosUser

def init_database():
    """Inicializa o banco de dados com usuário admin padrão"""
    with app.app_context():
        # Criar todas as tabelas
        db.create_all()
        
        # Verificar se já existe um admin
        admin_exists = TronosUser.query.filter_by(user_type='admin').first()
        
        if not admin_exists:
            # Criar usuário admin padrão
            admin_user = TronosUser(
                login='admin',
                full_name='Administrador do Sistema',
                email='admin@tronos.com',
                birth_date=date(1990, 1, 1),
                whatsapp='(11) 99999-9999',
                user_type='admin',
                is_approved=True
            )
            admin_user.set_password('admin123')
            
            db.session.add(admin_user)
            db.session.commit()
            
            print("✅ Usuário admin criado com sucesso!")
            print("Login: admin")
            print("Senha: admin123")
        else:
            print("ℹ️ Usuário admin já existe no banco de dados")
        
        print("✅ Banco de dados inicializado com sucesso!")

if __name__ == '__main__':
    init_database()

