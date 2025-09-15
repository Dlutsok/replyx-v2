#!/usr/bin/env python3
"""
Тестирование различных конфигураций S3 для Timeweb Cloud Storage
"""
import boto3
from botocore.config import Config
from botocore.exceptions import ClientError
import tempfile
import os
from dotenv import load_dotenv

# Загружаем переменные окружения
load_dotenv()

def test_s3_config(config_name, **kwargs):
    """Тестирует конкретную конфигурацию S3"""
    print(f"\n🧪 Тестирование конфигурации: {config_name}")
    print("=" * 50)
    
    try:
        # Создаем S3 клиент с переданными параметрами
        s3_client = boto3.client('s3', **kwargs)
        
        # Создаем тестовый файл
        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.txt') as f:
            f.write("Test content for S3 upload")
            temp_file = f.name
        
        # Пытаемся загрузить файл
        bucket_name = os.getenv('S3_BUCKET_NAME')
        test_key = f"test_configs/{config_name}_test.txt"
        
        print(f"📤 Загружаем файл с ключом: {test_key}")
        
        with open(temp_file, 'rb') as f:
            s3_client.put_object(
                Bucket=bucket_name,
                Key=test_key,
                Body=f,
                ContentType='text/plain'
            )
        
        print(f"✅ {config_name}: УСПЕШНО!")
        
        # Проверяем, что файл действительно загружен
        try:
            s3_client.head_object(Bucket=bucket_name, Key=test_key)
            print(f"✅ {config_name}: Файл подтвержден в хранилище")
            
            # Удаляем тестовый файл
            s3_client.delete_object(Bucket=bucket_name, Key=test_key)
            print(f"🗑️ {config_name}: Тестовый файл удален")
            
        except ClientError as e:
            print(f"⚠️ {config_name}: Файл не найден после загрузки: {e}")
        
        # Удаляем временный файл
        os.unlink(temp_file)
        return True
        
    except Exception as e:
        print(f"❌ {config_name}: ОШИБКА - {e}")
        # Удаляем временный файл в случае ошибки
        if 'temp_file' in locals():
            try:
                os.unlink(temp_file)
            except:
                pass
        return False

def main():
    """Основная функция тестирования"""
    print("🧪 Тестирование различных конфигураций S3 для Timeweb Cloud")
    print("=" * 70)
    
    # Получаем данные из переменных окружения
    access_key = os.getenv('S3_ACCESS_KEY_ID')
    secret_key = os.getenv('S3_SECRET_ACCESS_KEY')
    endpoint_url = os.getenv('S3_ENDPOINT_URL')
    region = os.getenv('S3_REGION')
    
    print(f"📋 Настройки:")
    print(f"   Endpoint: {endpoint_url}")
    print(f"   Region: {region}")
    print(f"   Access Key: {access_key[:10]}***")
    
    successful_configs = []
    
    # Конфигурация 1: Path-style + v4
    config1_params = {
        'endpoint_url': endpoint_url,
        'region_name': region,
        'aws_access_key_id': access_key,
        'aws_secret_access_key': secret_key,
        'config': Config(
            s3={'addressing_style': 'path', 'signature_version': 's3v4'},
            region_name=region
        )
    }
    if test_s3_config("Path-style + v4", **config1_params):
        successful_configs.append("Path-style + v4")
    
    # Конфигурация 2: Virtual-hosted + v4
    config2_params = {
        'endpoint_url': endpoint_url,
        'region_name': region,
        'aws_access_key_id': access_key,
        'aws_secret_access_key': secret_key,
        'config': Config(
            s3={'addressing_style': 'virtual', 'signature_version': 's3v4'},
            region_name=region
        )
    }
    if test_s3_config("Virtual-hosted + v4", **config2_params):
        successful_configs.append("Virtual-hosted + v4")
    
    # Конфигурация 3: Path-style + v2
    config3_params = {
        'endpoint_url': endpoint_url,
        'region_name': region,
        'aws_access_key_id': access_key,
        'aws_secret_access_key': secret_key,
        'config': Config(
            s3={'addressing_style': 'path', 'signature_version': 's3v2'},
            region_name=region
        )
    }
    if test_s3_config("Path-style + v2", **config3_params):
        successful_configs.append("Path-style + v2")
    
    # Конфигурация 4: Virtual-hosted + v2
    config4_params = {
        'endpoint_url': endpoint_url,
        'region_name': region,
        'aws_access_key_id': access_key,
        'aws_secret_access_key': secret_key,
        'config': Config(
            s3={'addressing_style': 'virtual', 'signature_version': 's3v2'},
            region_name=region
        )
    }
    if test_s3_config("Virtual-hosted + v2", **config4_params):
        successful_configs.append("Virtual-hosted + v2")
    
    # Конфигурация 5: Без специальной конфигурации
    config5_params = {
        'endpoint_url': endpoint_url,
        'region_name': region,
        'aws_access_key_id': access_key,
        'aws_secret_access_key': secret_key,
    }
    if test_s3_config("Default config", **config5_params):
        successful_configs.append("Default config")
    
    # Конфигурация 6: Только с region_name в config
    config6_params = {
        'endpoint_url': endpoint_url,
        'region_name': region,
        'aws_access_key_id': access_key,
        'aws_secret_access_key': secret_key,
        'config': Config(region_name=region)
    }
    if test_s3_config("Region-only config", **config6_params):
        successful_configs.append("Region-only config")
    
    # Итоги
    print("\n" + "=" * 70)
    print("📊 ИТОГИ ТЕСТИРОВАНИЯ:")
    print("=" * 70)
    
    if successful_configs:
        print(f"✅ Рабочие конфигурации ({len(successful_configs)}):")
        for config in successful_configs:
            print(f"   - {config}")
        print(f"\n🎯 Рекомендуется использовать: {successful_configs[0]}")
    else:
        print("❌ Ни одна конфигурация не сработала!")
        print("🔍 Проверьте:")
        print("   - Правильность ключей доступа")
        print("   - Доступность endpoint URL")
        print("   - Существование бакета")
        print("   - Права доступа к бакету")

if __name__ == "__main__":
    main()
